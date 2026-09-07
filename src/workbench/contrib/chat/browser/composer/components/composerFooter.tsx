import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AttachPlusIcon, CheckIcon, ChevronDownIcon } from "@/base/browser/ui/icons/iconRegistry";
import { Tooltip } from "@/base/browser/ui/tooltip/tooltip";
import { useI18n } from "@/platform/localization/localizationService";
import { appState } from "@/platform/storage/common/keyValueStore";
import { ComposerOptions } from "./composerOptions";

interface EffortOption {
  value: string;
  labelKey: string;
  tokens?: number;
}

interface ComposerFooterProps {
  controlStyle: React.CSSProperties;
  shellStyle: React.CSSProperties;
  onAttachClick: () => void;
  attachDisabled: boolean;
  currentModel: string;
  onPickModel: (id: string, providerDbId?: string) => void;
  onOpenSettings: (tab?: string) => void;
  showReasoningEffort: boolean;
  currentEffort: string | undefined;
  onReasoningEffortChange: (effort: string | null) => void;
  effortOptions: EffortOption[];
  onOptionsOpen: () => void;
  onExitShell: () => void;
  primaryAction: React.ReactNode;
}

type PermissionMode = "ask" | "approve" | "full-access";

function PermissionModeIcon({ mode, size = 14 }: { mode: PermissionMode; size?: number }): React.ReactElement {
  if (mode === "ask") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8.3 11V6.8a1.35 1.35 0 0 1 2.7 0V10" stroke="currentColor" strokeWidth="1.55" />
        <path d="M11 9V5.8a1.35 1.35 0 1 1 2.7 0V10" stroke="currentColor" strokeWidth="1.55" />
        <path d="M13.7 9V7a1.35 1.35 0 1 1 2.7 0v5" stroke="currentColor" strokeWidth="1.55" />
        <path
          d="M8.3 9.7V8.5a1.35 1.35 0 0 0-2.7 0v5.2L4.4 12.5a1.45 1.45 0 0 0-2.05 2.05l4.2 4.2A5 5 0 0 0 10.1 20h2.3a4 4 0 0 0 4-4v-4"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (mode === "full-access") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.8 20 6v5.2c0 4.8-3.2 8.4-8 10-4.8-1.6-8-5.2-8-10V6l8-3.2Z"
          stroke="currentColor"
          strokeWidth="1.55"
        />
        <path d="M12 7.3v5.8M12 16.7h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.8 20 6v5.2c0 4.8-3.2 8.4-8 10-4.8-1.6-8-5.2-8-10V6l8-3.2Z"
        stroke="currentColor"
        strokeWidth="1.55"
      />
      <path
        d="m8.6 12 2.1 2.1 4.7-4.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningTriangleIcon({ size = 18 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.3 4.2 2.7 17.4A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.6L13.7 4.2a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path d="M12 9v4.5M12 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FullAccessCapabilityIcon({ kind }: { kind: "files" | "terminal" | "internet" }): React.ReactElement {
  if (kind === "files") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      </svg>
    );
  }
  if (kind === "terminal") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function ComposerFooter({
  controlStyle,
  shellStyle,
  onAttachClick,
  attachDisabled,
  currentModel,
  onPickModel,
  onOpenSettings,
  showReasoningEffort,
  currentEffort,
  onReasoningEffortChange,
  effortOptions,
  onOptionsOpen,
  onExitShell,
  primaryAction,
}: ComposerFooterProps): React.ReactElement {
  const { t } = useI18n();
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("full-access");
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [fullAccessConfirmOpen, setFullAccessConfirmOpen] = useState(false);
  const permissionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([appState.get("settings:permissionMode"), appState.get("settings:autoAccept")]).then(
      ([savedMode, autoAccept]) => {
        if (!alive) return;
        if (savedMode === "ask" || savedMode === "approve" || savedMode === "full-access") {
          setPermissionMode(savedMode);
        } else {
          setPermissionMode(autoAccept === "false" ? "ask" : "full-access");
        }
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const handleSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; value?: unknown }>).detail;
      if (detail?.key === "permissionMode") {
        const value = detail.value;
        if (value === "ask" || value === "approve" || value === "full-access") setPermissionMode(value);
      }
      if (detail?.key === "autoAccept") {
        setPermissionMode(detail.value === false || detail.value === "false" ? "ask" : "full-access");
      }
    };
    window.addEventListener("vibe:settings-changed", handleSettingsChanged);
    return () => window.removeEventListener("vibe:settings-changed", handleSettingsChanged);
  }, []);

  useEffect(() => {
    if (!permissionOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!permissionRef.current?.contains(event.target as Node)) setPermissionOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPermissionOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [permissionOpen]);

  useEffect(() => {
    if (!fullAccessConfirmOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullAccessConfirmOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullAccessConfirmOpen]);

  const persistPermissionMode = (mode: PermissionMode) => {
    const autoAccept = mode !== "ask";
    setPermissionMode(mode);
    setPermissionOpen(false);
    void Promise.all([
      appState.set("settings:permissionMode", mode),
      appState.set("settings:autoAccept", String(autoAccept)),
    ]);
    window.dispatchEvent(new CustomEvent("settings-changed", { detail: { key: "autoAccept", value: autoAccept } }));
    window.dispatchEvent(new CustomEvent("vibe:settings-changed", { detail: { key: "permissionMode", value: mode } }));
  };

  const choosePermissionMode = (mode: PermissionMode) => {
    if (mode === "full-access" && permissionMode !== "full-access") {
      setPermissionOpen(false);
      setFullAccessConfirmOpen(true);
      return;
    }
    persistPermissionMode(mode);
  };

  const permissionLabel =
    permissionMode === "ask"
      ? t("composerPermissionAsk")
      : permissionMode === "approve"
        ? t("composerPermissionConfirm")
        : t("composerPermissionFull");

  return (
    <>
      <footer className="composer__footer">
        <div className="composer__footer-leading">
          <div className="composer__normal-controls" style={controlStyle}>
            <Tooltip text={t("attachFiles")}>
              <button
                type="button"
                data-action="composer-attach"
                className="composer__icon-button composer__attach-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onAttachClick}
                disabled={attachDisabled}
                aria-label={t("attachFiles")}
              >
                <AttachPlusIcon />
              </button>
            </Tooltip>

            <div className="composer-permissions" ref={permissionRef}>
              <button
                type="button"
                className={`composer__permission-button${permissionOpen ? " composer__permission-button--open" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setPermissionOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={permissionOpen}
                aria-label={t("composerPermissionMenu")}
              >
                <PermissionModeIcon mode={permissionMode} />
                <span>{permissionLabel}</span>
                <ChevronDownIcon size={10} />
              </button>

              {permissionOpen && (
                <div className="composer-permissions__menu" role="menu" aria-label={t("composerPermissionMenu")}>
                  <div className="composer-permissions__header">
                    <div className="composer-permissions__title">{t("composerPermissionTitle")}</div>
                  </div>
                  <button
                    type="button"
                    className={`composer-permissions__option${permissionMode === "ask" ? " composer-permissions__option--active" : ""}`}
                    role="menuitemradio"
                    aria-checked={permissionMode === "ask"}
                    onClick={() => choosePermissionMode("ask")}
                  >
                    <span className="composer-permissions__icon composer-permissions__icon--ask">
                      <PermissionModeIcon mode="ask" size={15} />
                    </span>
                    <span className="composer-permissions__copy">
                      <span className="composer-permissions__label">{t("composerPermissionAsk")}</span>
                      <span className="composer-permissions__description">{t("composerPermissionAskDesc")}</span>
                    </span>
                    {permissionMode === "ask" && (
                      <span className="composer-permissions__check">
                        <CheckIcon size={14} />
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`composer-permissions__option${permissionMode === "approve" ? " composer-permissions__option--active" : ""}`}
                    role="menuitemradio"
                    aria-checked={permissionMode === "approve"}
                    onClick={() => choosePermissionMode("approve")}
                  >
                    <span className="composer-permissions__icon composer-permissions__icon--approve">
                      <PermissionModeIcon mode="approve" size={15} />
                    </span>
                    <span className="composer-permissions__copy">
                      <span className="composer-permissions__label">{t("composerPermissionConfirm")}</span>
                      <span className="composer-permissions__description">{t("composerPermissionConfirmDesc")}</span>
                    </span>
                    {permissionMode === "approve" && (
                      <span className="composer-permissions__check">
                        <CheckIcon size={14} />
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`composer-permissions__option composer-permissions__option--warning${permissionMode === "full-access" ? " composer-permissions__option--active" : ""}`}
                    role="menuitemradio"
                    aria-checked={permissionMode === "full-access"}
                    onClick={() => choosePermissionMode("full-access")}
                  >
                    <span className="composer-permissions__icon composer-permissions__icon--warning">
                      <PermissionModeIcon mode="full-access" size={15} />
                    </span>
                    <span className="composer-permissions__copy">
                      <span className="composer-permissions__label">{t("composerPermissionFull")}</span>
                      <span className="composer-permissions__description">{t("composerPermissionFullDesc")}</span>
                    </span>
                    {permissionMode === "full-access" && (
                      <span className="composer-permissions__check">
                        <CheckIcon size={14} />
                      </span>
                    )}
                  </button>
                  <div className="composer-permissions__divider" />
                  <button
                    type="button"
                    className="composer-permissions__settings"
                    role="menuitem"
                    onClick={() => {
                      setPermissionOpen(false);
                      onOpenSettings("general");
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>{t("composerPermissionSettings")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="composer__shell-controls" style={shellStyle}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="composer__shell-label">{t("terminalModeLabel")}</span>
            <button
              type="button"
              className="composer__shell-exit"
              onClick={onExitShell}
              aria-label={t("exitTerminalMode")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2 2l8 8M10 2L2 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="composer__footer-trailing">
          <div className="composer__normal-controls composer__normal-controls--trailing" style={controlStyle}>
            <ComposerOptions
              currentModel={currentModel}
              onPickModel={onPickModel}
              onOpenSettings={onOpenSettings}
              showReasoningEffort={showReasoningEffort}
              currentEffort={currentEffort}
              onReasoningEffortChange={onReasoningEffortChange}
              effortOptions={effortOptions}
              onOpen={onOptionsOpen}
            />
          </div>
          {primaryAction}
        </div>
      </footer>

      {fullAccessConfirmOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="composer-permissions__dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setFullAccessConfirmOpen(false);
            }}
          >
            <div
              className="composer-permissions__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="full-access-title"
            >
              <div className="composer-permissions__dialog-title-section">
                <div className="composer-permissions__dialog-warn-badge">
                  <WarningTriangleIcon size={16} />
                </div>
                <div id="full-access-title" className="composer-permissions__dialog-title">
                  {t("composerPermissionFullConfirmTitle")}
                </div>
              </div>
              <div className="composer-permissions__dialog-description">
                {t("composerPermissionFullConfirmDesc")}
              </div>
              <div className="composer-permissions__capabilities">
                {(["files", "terminal", "internet"] as const).map((kind) => (
                  <div className="composer-permissions__capability" key={kind}>
                    <div className="composer-permissions__capability-icon">
                      <FullAccessCapabilityIcon kind={kind} />
                    </div>
                    <div className="composer-permissions__capability-copy">
                      <div className="composer-permissions__capability-title">
                        {t(`composerPermissionFull${kind.charAt(0).toUpperCase()}${kind.slice(1)}`)}
                      </div>
                      <div className="composer-permissions__capability-description">
                        {t(`composerPermissionFull${kind.charAt(0).toUpperCase()}${kind.slice(1)}Desc`)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="composer-permissions__dialog-risk">
                {t("composerPermissionFullRisk")}
              </div>
              <div className="composer-permissions__dialog-actions">
                <button
                  type="button"
                  className="composer-permissions__dialog-cancel"
                  onClick={() => setFullAccessConfirmOpen(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="composer-permissions__dialog-confirm"
                  onClick={() => {
                    setFullAccessConfirmOpen(false);
                    persistPermissionMode("full-access");
                  }}
                >
                  <WarningTriangleIcon size={14} />
                  {t("composerPermissionFullConfirm")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
