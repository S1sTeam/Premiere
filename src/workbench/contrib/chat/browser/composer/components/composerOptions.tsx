import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "@/base/browser/ui/icons/iconRegistry";
import { Loader } from "@/base/browser/ui/loader/loader";
import { useI18n } from "@/platform/localization/localizationService";
import { modelsDevService } from "@/workbench/services/aiProviders/browser/modelsDevService";
import { getModelProviderId, ProviderLogo } from "@/workbench/services/aiProviders/browser/providerLogo";
import { PROVIDER_TEMPLATES } from "@/workbench/services/aiProviders/browser/providerTemplates";
import type { Provider } from "@/workbench/services/aiProviders/common/aiProvider";
import { getCurrentConfig } from "@/workbench/services/aiProviders/tauri/aiProviderRuntimeState";
import { aiProviderService } from "@/workbench/services/aiProviders/tauri/aiProviderService";
import {
  parseEffortValue,
  formatEffortValue,
  TOKEN_BUDGET_PRESETS,
} from "@/workbench/services/aiProviders/common/reasoningEffort";
import { modelDisplayName } from "../utils/modelDisplay";

interface ModelEntry {
  id: string;
  name: string;
  providerDbId: string;
}

interface ModelGroup {
  providerDbId: string;
  providerId: string;
  providerName: string;
  models: ModelEntry[];
}

interface EffortOption {
  value: string;
  labelKey: string;
  tokens?: number;
}

interface ComposerOptionsProps {
  currentModel: string;
  onPickModel: (id: string, providerDbId?: string) => void;
  onOpenSettings: (tab?: string) => void;
  showReasoningEffort: boolean;
  currentEffort: string | undefined;
  onReasoningEffortChange: (effort: string | null) => void;
  effortOptions: EffortOption[];
  onOpen?: () => void;
}

const CACHE_TTL = 30 * 60 * 1000;
const CACHE_KEY_PREFIX = "models:";
const memCache = new Map<string, { models: ModelEntry[]; expires: number }>();
let diskCacheLoaded = false;

function loadCache(): Map<string, { models: ModelEntry[]; expires: number }> {
  const cache = new Map<string, { models: ModelEntry[]; expires: number }>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (raw) cache.set(key.slice(CACHE_KEY_PREFIX.length), JSON.parse(raw));
    }
  } catch {
    // An unavailable or corrupt cache should never block the composer.
  }
  return cache;
}

function saveCache(key: string, models: ModelEntry[], expires: number): void {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ models, expires }));
  } catch {
    // Ignore storage quotas and privacy-mode storage failures.
  }
}

function useModelGroups() {
  const [groups, setGroups] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      if (!diskCacheLoaded) {
        for (const [key, value] of loadCache()) memCache.set(key, value);
        diskCacheLoaded = true;
      }

      const [providers, enabledIds] = await Promise.all([
        aiProviderService.listProviders() as Promise<Provider[]>,
        aiProviderService.listEnabledModels() as Promise<string[]>,
      ]);
      const enabled = new Set(enabledIds);
      const allProviders = [...providers];
      const hasPremire = allProviders.some((p) => p.id === "premire" || p.baseUrl?.includes("sysik.mom"));
      if (!hasPremire) {
        allProviders.push({
          id: "premire",
          name: "Premire AI",
          baseUrl: "https://free.sysik.mom/v1",
          apiKey: "",
          model: "",
          addedAt: Date.now(),
        });
      }
      const connected = allProviders.filter(
        (provider) => provider.apiKey || provider.id === "premire" || provider.baseUrl?.includes("sysik.mom"),
      );
      const now = Date.now();
      const results: ModelGroup[] = [];
      await modelsDevService.initialize();

      await Promise.allSettled(
        connected.map(async (provider) => {
          const matched = modelsDevService.findProviderByUrl(provider.baseUrl);
          const template = matched
            ? PROVIDER_TEMPLATES.find((candidate) => candidate.id === matched.id)
            : PROVIDER_TEMPLATES.find(
                (candidate) =>
                  provider.baseUrl &&
                  candidate.baseUrl &&
                  provider.baseUrl.startsWith(candidate.baseUrl.replace(/\/+$/, "")),
              );
          const providerId = matched?.id ?? template?.id ?? provider.id;
          const providerName = matched?.name ?? template?.name ?? provider.name;
          const cacheKey = `${providerId}:${provider.baseUrl}`;

          // 1. Gather custom models added manually by the user
          const customEntries: ModelEntry[] = (provider.customModels ?? [])
            .filter((cm) => cm.key?.trim())
            .map((cm) => ({
              id: cm.key.trim(),
              name: cm.value?.trim() || cm.key.trim(),
              providerDbId: provider.id,
            }));

          // 2. Fetch models from provider endpoint
          let fetchedModels: ModelEntry[] = [];
          const cached = memCache.get(cacheKey);
          if (cached && cached.expires > now) {
            fetchedModels = cached.models;
          } else {
            try {
              const customHeaders = provider.headers
                ?.filter((h) => h.key?.trim())
                .map((h) => [h.key.trim(), h.value.trim()] as [string, string]);
              const response = await aiProviderService.fetchModels(
                provider.baseUrl,
                provider.apiKey,
                providerId,
                provider.modelsUrl ?? undefined,
                customHeaders,
              );
              if (response.ok && response.models.length > 0) {
                fetchedModels = response.models.map((model) => ({
                  id: model.id,
                  name: model.name,
                  providerDbId: provider.id,
                }));
                const expires = now + CACHE_TTL;
                memCache.set(cacheKey, { models: fetchedModels, expires });
                saveCache(cacheKey, fetchedModels, expires);
              }
            } catch (err) {
              console.warn("Failed to fetch models for", providerName, err);
            }
          }

          // Combine custom entries and fetched models (custom take precedence)
          const modelMap = new Map<string, ModelEntry>();
          for (const cm of customEntries) {
            modelMap.set(cm.id, cm);
          }
          for (const fm of fetchedModels) {
            if (!modelMap.has(fm.id)) modelMap.set(fm.id, fm);
          }
          if (provider.model && provider.model !== "sonnet-5" && !modelMap.has(provider.model)) {
            modelMap.set(provider.model, {
              id: provider.model,
              name: provider.model,
              providerDbId: provider.id,
            });
          }

          const allModels = Array.from(modelMap.values());
          if (allModels.length === 0) return;

          const hasExplicit = allModels.some(
            (model) => enabled.has(`${provider.id}::${model.id}`) || enabled.has(model.id),
          );
          const visibleModels = hasExplicit
            ? allModels.filter(
                (model) =>
                  model.id === provider.model ||
                  enabled.has(`${provider.id}::${model.id}`) ||
                  enabled.has(model.id),
              )
            : allModels;
          if (visibleModels.length === 0) return;

          results.push({
            providerDbId: provider.id,
            providerId,
            providerName,
            models: visibleModels,
          });
        }),
      );

      const currentConfig = getCurrentConfig();
      results.sort((a, b) => {
        const aIsActive =
          a.providerDbId === currentConfig?.providerId ||
          a.providerId === currentConfig?.providerId ||
          (currentConfig?.baseUrl && a.providerDbId === "premire" && currentConfig.baseUrl.includes("sysik.mom"));
        const bIsActive =
          b.providerDbId === currentConfig?.providerId ||
          b.providerId === currentConfig?.providerId ||
          (currentConfig?.baseUrl && b.providerDbId === "premire" && currentConfig.baseUrl.includes("sysik.mom"));
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;

        const aProv = connected.find((p) => p.id === a.providerDbId);
        const bProv = connected.find((p) => p.id === b.providerDbId);
        const aHasKey = Boolean(aProv?.apiKey?.trim() && aProv?.apiKey !== "***");
        const bHasKey = Boolean(bProv?.apiKey?.trim() && bProv?.apiKey !== "***");
        if (aHasKey && !bHasKey) return -1;
        if (!aHasKey && bHasKey) return 1;

        return a.providerName.localeCompare(b.providerName);
      });

      setGroups(results);
    } catch (err) {
      console.error("useModelGroups fetch error:", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const handleUpdate = () => {
      memCache.clear();
      fetch();
    };
    window.addEventListener("premire:models-changed", handleUpdate);
    window.addEventListener("vibe:settings-changed", handleUpdate);
    return () => {
      window.removeEventListener("premire:models-changed", handleUpdate);
      window.removeEventListener("vibe:settings-changed", handleUpdate);
    };
  }, [fetch]);

  return { groups, loading, fetch };
}

export function ComposerOptions({
  currentModel,
  onPickModel,
  onOpenSettings,
  showReasoningEffort,
  currentEffort,
  onReasoningEffortChange,
  effortOptions,
  onOpen,
}: ComposerOptionsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<"model" | "effort" | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const [compactMenu, setCompactMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { groups, loading, fetch } = useModelGroups();

  useEffect(() => aiProviderService.onEnabledModelsChange(fetch), [fetch]);

  const activeModel = useMemo(() => {
    for (const group of groups) {
      const model = group.models.find((candidate) => candidate.id === currentModel);
      if (model) return { name: modelDisplayName(model.name), group };
    }
    return { name: modelDisplayName(currentModel) || t("selectModelFallback"), group: null };
  }, [currentModel, groups, t]);

  const parsedEffort = useMemo(() => parseEffortValue(currentEffort), [currentEffort]);
  const [customTokens, setCustomTokens] = useState<number>(parsedEffort.tokens || 8192);

  useEffect(() => {
    if (parsedEffort.mode === "custom" && parsedEffort.tokens > 0) {
      setCustomTokens(parsedEffort.tokens);
    }
  }, [parsedEffort]);

  const activeEffort = useMemo(() => {
    if (parsedEffort.mode === "off") {
      return t("reasoningEffortNone");
    }
    if (parsedEffort.mode === "custom") {
      const k =
        parsedEffort.tokens >= 1024
          ? `${Math.round(parsedEffort.tokens / 1024)}K`
          : String(parsedEffort.tokens);
      return `${t("reasoningEffortCustom")} (${k})`;
    }
    const option = effortOptions.find((candidate) => candidate.value === parsedEffort.mode);
    return option ? t(option.labelKey) : currentEffort || t("reasoningEffortNone");
  }, [parsedEffort, currentEffort, effortOptions, t]);

  const close = () => {
    setOpen(false);
    setSubmenu(null);
    setCompactMenu(false);
    setModelSearch("");
  };

  const openSubmenu = (nextSubmenu: "model" | "effort", interaction: "hover" | "click") => {
    const menuRect = menuRef.current?.getBoundingClientRect();
    const submenuWidth = nextSubmenu === "model" ? 260 : 275;
    const wouldOverflowRight = menuRect ? menuRect.right + 6 + submenuWidth > window.innerWidth - 8 : false;
    const nextCompactMenu = window.innerWidth <= 1050 || wouldOverflowRight;
    setCompactMenu(nextCompactMenu);
    if (interaction === "hover" && nextCompactMenu) return;
    setSubmenu(nextSubmenu);
  };

  useEffect(() => {
    if (!open || !submenu) return;
    const updateLayout = () => {
      const menuRect = menuRef.current?.getBoundingClientRect();
      const submenuWidth = submenu === "model" ? 260 : 275;
      const wouldOverflowRight = menuRect ? menuRect.right + 6 + submenuWidth > window.innerWidth - 8 : false;
      setCompactMenu(window.innerWidth <= 1050 || wouldOverflowRight);
    };
    window.addEventListener("resize", updateLayout);
    updateLayout();
    return () => window.removeEventListener("resize", updateLayout);
  }, [open, submenu]);

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setSubmenu(null);
        setCompactMenu(false);
        if (nextOpen) {
          onOpen?.();
          void fetch();
        }
      }}
    >
      <div className="composer-options">
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={`composer-options__trigger${open ? " composer-options__trigger--open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onMouseDown={(event) => event.preventDefault()}
          >
            <span className="composer-options__provider" aria-hidden="true">
              <ProviderLogo
                providerId={getModelProviderId(currentModel, activeModel.name, activeModel.group?.providerId)}
                style={{ width: 14, height: 14 }}
              />
            </span>
            <span className="composer-options__summary">
              <span className="composer-options__model-summary">{activeModel.name}</span>
              {showReasoningEffort && <span className="composer-options__effort-summary">{activeEffort}</span>}
            </span>
            <ChevronDownIcon size={11} />
          </button>
        </PopoverPrimitive.Trigger>
      </div>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={menuRef}
          className={`composer-options__menu${submenu ? " composer-options__menu--submenu" : ""}${
            submenu === "model" ? " composer-options__menu--models" : ""
          }${compactMenu && submenu ? " composer-options__menu--compact" : ""}`}
          role="menu"
          aria-label={t("composerOptions")}
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (!submenu) return;
            event.preventDefault();
            setSubmenu(null);
          }}
        >
          <div className="composer-options__root-menu">
            <button
              type="button"
              className={`composer-options__row${submenu === "model" ? " composer-options__row--active" : ""}`}
              role="menuitem"
              onMouseEnter={() => openSubmenu("model", "hover")}
              onClick={() => openSubmenu("model", "click")}
            >
              <span>{t("composerModel")}</span>
              <span className="composer-options__row-value">{activeModel.name}</span>
              <ChevronRightIcon />
            </button>

            {showReasoningEffort && (
              <button
                type="button"
                className={`composer-options__row${submenu === "effort" ? " composer-options__row--active" : ""}`}
                role="menuitem"
                onMouseEnter={() => openSubmenu("effort", "hover")}
                onClick={() => openSubmenu("effort", "click")}
              >
                <span>{t("composerEffort")}</span>
                <span className="composer-options__row-value">{activeEffort}</span>
                <ChevronRightIcon />
              </button>
            )}

            <div className="composer-options__divider" />
            <button
              type="button"
              className="composer-options__row composer-options__row--muted"
              role="menuitem"
              onMouseEnter={() => setSubmenu(null)}
              onClick={() => {
                close();
                onOpenSettings("models");
              }}
            >
              <span>{t("configureModels")}</span>
            </button>
          </div>

          {submenu === "model" && (
            <div className="composer-options__submenu composer-options__submenu--models" role="menu">
              <button type="button" className="composer-options__submenu-title" onClick={() => setSubmenu(null)}>
                <ChevronRightIcon />
                <span>{t("composerModel")}</span>
              </button>
              <div className="composer-options__model-search">
                <input
                  type="text"
                  className="composer-options__search-input"
                  placeholder={t("searchModels") || "Search models..."}
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
              {loading && (
                <div className="composer-options__empty">
                  <Loader />
                </div>
              )}
              {!loading && groups.length === 0 && <div className="composer-options__empty">{t("noModelsEnabled")}</div>}
              {groups.map((group) => {
                const searchLower = modelSearch.trim().toLowerCase();
                const filteredModels = searchLower
                  ? group.models.filter(
                      (m) =>
                        m.name.toLowerCase().includes(searchLower) ||
                        m.id.toLowerCase().includes(searchLower),
                    )
                  : group.models;
                if (filteredModels.length === 0) return null;
                return (
                  <div className="composer-options__model-group" key={group.providerDbId}>
                    <div className="composer-options__group-label">
                      <ProviderLogo providerId={group.providerId} style={{ width: 13, height: 13 }} />
                      <span>{group.providerName}</span>
                    </div>
                    {filteredModels.map((model) => {
                      const modelProvId = getModelProviderId(model.id, model.name, group.providerId);
                      return (
                        <button
                          type="button"
                          className="composer-options__submenu-row"
                          role="menuitemradio"
                          aria-checked={model.id === currentModel}
                          key={`${group.providerDbId}::${model.id}`}
                          onClick={() => {
                            onPickModel(model.id, group.providerDbId);
                            close();
                          }}
                        >
                          <ProviderLogo
                            providerId={modelProvId}
                            style={{ width: 15, height: 15 }}
                          />
                          <span>{modelDisplayName(model.name)}</span>
                          {model.id === currentModel && <CheckIcon />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {submenu === "effort" && (
            <div className="composer-options__submenu composer-options__submenu--effort" role="menu">
              <button type="button" className="composer-options__submenu-title" onClick={() => setSubmenu(null)}>
                <ChevronRightIcon />
                <span>{t("composerEffort")}</span>
              </button>
              {effortOptions.map((option) => {
                const isSelected =
                  option.value === ""
                    ? parsedEffort.mode === "off"
                    : option.value === "custom"
                    ? parsedEffort.mode === "custom"
                    : parsedEffort.mode === option.value;

                const tokenBadge =
                  option.value !== "" && option.value !== "custom" && option.tokens && option.tokens > 0
                    ? option.tokens >= 1024
                      ? `${Math.round(option.tokens / 1024)}K`
                      : String(option.tokens)
                    : null;

                return (
                  <button
                    type="button"
                    className="composer-options__submenu-row"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    key={option.value || "off"}
                    onClick={() => {
                      if (option.value === "custom") {
                        onReasoningEffortChange(formatEffortValue("custom", customTokens));
                      } else {
                        onReasoningEffortChange(option.value || null);
                        close();
                      }
                    }}
                  >
                    <div className="composer-options__effort-content">
                      <span className="composer-options__effort-label">{t(option.labelKey)}</span>
                      {tokenBadge && <span className="composer-options__effort-badge">{tokenBadge}</span>}
                    </div>
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}

              {parsedEffort.mode === "custom" && (
                <div className="composer-options__custom-box">
                  <span className="composer-options__custom-label">
                    {t("reasoningEffortCustom")} ({t("reasoningEffortTokens")})
                  </span>
                  <div className="composer-options__custom-presets">
                    {TOKEN_BUDGET_PRESETS.map((preset) => {
                      const label = `${preset >= 1024 ? preset / 1024 : preset}K`;
                      const isChipActive = parsedEffort.tokens === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          className={`composer-options__preset-chip${
                            isChipActive ? " composer-options__preset-chip--active" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomTokens(preset);
                            onReasoningEffortChange(formatEffortValue("custom", preset));
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="composer-options__custom-input-row">
                    <input
                      type="number"
                      min={512}
                      max={128000}
                      step={512}
                      className="composer-options__custom-input"
                      value={customTokens}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setCustomTokens(val);
                          onReasoningEffortChange(formatEffortValue("custom", val));
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="composer-options__custom-unit">{t("reasoningEffortTokens")}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
