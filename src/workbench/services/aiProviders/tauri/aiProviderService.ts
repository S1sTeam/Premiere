import { invoke } from "@tauri-apps/api/core";
import { type Result, wrap } from "@/platform/native/common/nativeResult";
import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";
import { modelsDevService } from "../browser/modelsDevService";
import type { ModelInfo, Provider } from "../common/aiProvider";
import { getCurrentConfig, setCurrentConfig } from "./aiProviderRuntimeState";

const enabledModelsListeners = new Set<() => void>();

function notifyEnabledModelsChanged(): void {
  for (const listener of enabledModelsListeners) listener();
}

const BROWSER_PROVIDERS_KEY = "premire_browser_providers";
const BROWSER_ENABLED_MODELS_KEY = "premire_browser_enabled_models";

function serializeProvider(provider: Provider): any {
  return {
    ...provider,
    headers: provider.headers ? JSON.stringify(provider.headers) : null,
    parameters: provider.parameters ? JSON.stringify(provider.parameters) : null,
    customModels: provider.customModels ? JSON.stringify(provider.customModels) : null,
  };
}

function deserializeProvider(p: any): Provider {
  const parse = (val: any) => {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        const res = JSON.parse(val);
        return Array.isArray(res) ? res : null;
      } catch {
        return null;
      }
    }
    return null;
  };
  return {
    ...p,
    headers: parse(p.headers),
    parameters: parse(p.parameters),
    customModels: parse(p.customModels),
  };
}

function deduplicateProviders(list: Provider[]): Provider[] {
  const seen = new Set<string>();
  const result: Provider[] = [];
  for (const p of list) {
    const isPremire = p.id === "premire" || p.baseUrl?.includes("sysik.mom");
    const key = isPremire
      ? "premire"
      : p.baseUrl
        ? p.baseUrl.replace(/\/+$/, "").toLowerCase()
        : p.id;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

function getBrowserProviders(): Provider[] {
  try {
    const raw = localStorage.getItem(BROWSER_PROVIDERS_KEY);
    if (raw) {
      const parsed = (JSON.parse(raw) as any[]).map(deserializeProvider);
      return deduplicateProviders(parsed);
    }
  } catch {}
  return [];
}

function saveBrowserProviders(providers: Provider[]) {
  try {
    const clean = deduplicateProviders(providers);
    localStorage.setItem(BROWSER_PROVIDERS_KEY, JSON.stringify(clean));
  } catch {}
}

export const aiProviderService = {
  setModel: (model: string): Promise<void> => {
    const currentConfig = getCurrentConfig();
    if (currentConfig) {
      currentConfig.model = model;
      setCurrentConfig(currentConfig);
    }
    if (isBrowserDevPreview) return Promise.resolve();
    return invoke("set_model", { model });
  },

  setReasoningEffort: (reasoningEffort: string | null): Promise<void> => {
    const currentConfig = getCurrentConfig();
    if (currentConfig) currentConfig.reasoningEffort = reasoningEffort ?? undefined;
    if (isBrowserDevPreview) return Promise.resolve();
    return invoke("set_reasoning_effort", { reasoningEffort });
  },

  setCwd: (cwd: string): Promise<void> => {
    const currentConfig = getCurrentConfig();
    if (currentConfig) currentConfig.cwd = cwd;
    if (isBrowserDevPreview) return Promise.resolve();
    return invoke("agent_set_cwd", { cwd });
  },

  setProvider: (apiKey: string, baseUrl: string, model: string, providerId?: string): Promise<void> => {
    const currentConfig = getCurrentConfig();
    if (currentConfig) {
      Object.assign(currentConfig, { apiKey, baseUrl, model, providerId });
      setCurrentConfig(currentConfig);
    } else {
      setCurrentConfig({
        apiKey,
        baseUrl,
        model,
        providerId: providerId ?? "premire",
        cwd: "C:/Users/Developer/Desktop/Premire",
        autoApprove: true,
      });
    }

    try {
      const providers = getBrowserProviders();
      const existing = providers.find((p) => p.id === providerId || (providerId === "premire" && p.baseUrl?.includes("sysik.mom")));
      if (existing) {
        if (apiKey) existing.apiKey = apiKey;
        if (baseUrl) existing.baseUrl = baseUrl;
        if (model) existing.model = model;
        saveBrowserProviders(providers);
      }
    } catch {}

    window.dispatchEvent(new CustomEvent("premire:provider-changed", { detail: { apiKey, baseUrl, model, providerId } }));
    window.dispatchEvent(new CustomEvent("premire:models-changed"));

    if (isBrowserDevPreview) return Promise.resolve();
    return invoke("agent_set_provider", { apiKey, baseUrl, model, providerId });
  },

  listProviders: async (): Promise<Provider[]> => {
    if (isBrowserDevPreview) {
      return getBrowserProviders();
    }
    try {
      const list = await invoke<any[]>("providers_list");
      if (Array.isArray(list) && list.length > 0) {
        const parsed = list.map(deserializeProvider);
        saveBrowserProviders(parsed);
        return parsed;
      }
    } catch {}
    return getBrowserProviders();
  },

  saveProvider: async (provider: Provider): Promise<void> => {
    const list = getBrowserProviders();
    const idx = list.findIndex((p) => p.id === provider.id);
    if (idx >= 0) list[idx] = provider;
    else list.push(provider);
    saveBrowserProviders(list);

    if (!isBrowserDevPreview) {
      try {
        await invoke("providers_save", { provider: serializeProvider(provider) });
      } catch (err) {
        console.warn("Tauri providers_save warning:", err);
      }
    }
    notifyEnabledModelsChanged();
    window.dispatchEvent(new CustomEvent("premire:models-changed"));
    window.dispatchEvent(new CustomEvent("vibe:settings-changed"));
  },

  deleteProvider: async (id: string): Promise<void> => {
    const list = getBrowserProviders().filter((p) => p.id !== id);
    saveBrowserProviders(list);
    if (!isBrowserDevPreview) {
      try {
        await invoke("providers_delete", { id });
      } catch (err) {
        console.warn("Tauri providers_delete warning:", err);
      }
    }
    notifyEnabledModelsChanged();
    window.dispatchEvent(new CustomEvent("premire:models-changed"));
    window.dispatchEvent(new CustomEvent("vibe:settings-changed"));
  },

  fetchModels: async (
    baseUrl: string,
    apiKey: string,
    providerId?: string,
    modelsUrl?: string,
    customHeaders?: [string, string][],
  ): Promise<Result<{ models: ModelInfo[] }>> => {
    const res = await wrap(
      async () => {
        if (isBrowserDevPreview) {
          const targetUrl = modelsUrl || `${baseUrl.replace(/\/+$/, "")}/models`;
          const headers: Record<string, string> = {};
          if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
          if (customHeaders) {
            for (const [k, v] of customHeaders) headers[k] = v;
          }
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
          const response = await fetch(proxyUrl, { headers });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const ct = response.headers.get("content-type") || "";
          if (!ct.includes("json")) throw new Error("Server returned non-JSON response (maintenance?)");
          const data = await response.json();
          const list = Array.isArray(data?.models)
            ? data.models
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : [];
          const models: ModelInfo[] = list
            .map((m: any) => {
              const rawId = m.id || m.name || "";
              const id = typeof rawId === "string" ? rawId.replace(/^models\//, "") : "";
              return {
                id,
                name: m.displayName || m.name || id,
              };
            })
            .filter((m: any) => !!m.id);
          return { models };
        }
        return invoke<{ models: ModelInfo[] }>("models_fetch", {
          baseUrl,
          apiKey,
          providerId,
          modelsUrl,
          customHeaders,
        });
      },
      (r) => r,
    );
    if (!res.ok) return res;
    await modelsDevService.initialize();

    const enriched = res.models.map((m) => {
      const meta = modelsDevService.getModel(m.id, providerId);
      return {
        ...m,
        description: meta?.description ?? m.description,
        contextLimit: meta?.limit?.context ?? modelsDevService.getModelContextLimit(m.id, providerId),
        outputLimit: meta?.limit?.output,
        supportsVision: modelsDevService.supportsVision(m.id, providerId),
        supportsReasoning: !!(meta?.reasoning || meta?.reasoning_options?.length),
        cost: meta?.cost
          ? {
              input: meta.cost.input,
              output: meta.cost.output,
              cache_read: meta.cost.cache_read,
            }
          : undefined,
      };
    });

    return { ok: true, models: enriched };
  },

  listDisabledModels: (): Promise<string[]> => {
    if (isBrowserDevPreview) return Promise.resolve([]);
    return invoke<string[]>("models_list_disabled");
  },

  toggleDisabledModel: (modelId: string): Promise<boolean> => {
    if (isBrowserDevPreview) return Promise.resolve(false);
    return invoke<boolean>("models_toggle_disabled", { modelId });
  },

  listEnabledModels: async (): Promise<string[]> => {
    try {
      const remote = await invoke<string[]>("models_list_enabled");
      if (Array.isArray(remote)) {
        try {
          localStorage.setItem(BROWSER_ENABLED_MODELS_KEY, JSON.stringify(remote));
        } catch {}
        return remote;
      }
    } catch {}
    try {
      const raw = localStorage.getItem(BROWSER_ENABLED_MODELS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  toggleEnabledModel: async (modelId: string): Promise<boolean> => {
    let enabled = false;
    try {
      const raw = localStorage.getItem(BROWSER_ENABLED_MODELS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const idx = list.indexOf(modelId);
      enabled = idx === -1;
      if (enabled) list.push(modelId);
      else list.splice(idx, 1);
      localStorage.setItem(BROWSER_ENABLED_MODELS_KEY, JSON.stringify(list));
    } catch {}

    try {
      enabled = await invoke<boolean>("models_toggle_enabled", { modelId });
    } catch (err) {
      console.warn("Tauri models_toggle_enabled warning:", err);
    }
    notifyEnabledModelsChanged();
    window.dispatchEvent(new CustomEvent("premire:models-changed"));
    window.dispatchEvent(new CustomEvent("vibe:settings-changed"));
    return enabled;
  },

  onEnabledModelsChange: (listener: () => void): (() => void) => {
    enabledModelsListeners.add(listener);
    return () => enabledModelsListeners.delete(listener);
  },
};
