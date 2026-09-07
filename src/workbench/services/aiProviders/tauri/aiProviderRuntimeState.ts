import type { Provider, VibeConfig } from "../common/aiProvider";

const CONFIG_STORAGE_KEY = "premire_active_config";
let currentConfig: VibeConfig | null = null;

function getStoredProvidersList(): Provider[] {
  try {
    const raw = localStorage.getItem("premire_browser_providers") || localStorage.getItem("premire_providers");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function getDefaultFlagshipModel(providerId?: string, baseUrl?: string): string {
  const id = (providerId || "").toLowerCase();
  const url = (baseUrl || "").toLowerCase();
  if (id === "groq" || url.includes("groq.com")) return "llama-3.3-70b-versatile";
  if (id === "openai" || url.includes("api.openai.com")) return "gpt-4o";
  if (id === "anthropic" || url.includes("api.anthropic.com")) return "claude-3-7-sonnet-20250219";
  if (id === "deepseek" || url.includes("deepseek.com")) return "deepseek-chat";
  if (id === "google" || url.includes("googleapis.com")) return "gemini-2.5-flash";
  if (id === "mistral" || url.includes("mistral.ai")) return "mistral-large-latest";
  if (id === "cerebras" || url.includes("cerebras.ai")) return "llama3.1-70b";
  if (id === "xai" || url.includes("x.ai")) return "grok-2-latest";
  if (id === "premire" || url.includes("sysik.mom")) return "sonnet-5";
  return "";
}

function loadStoredConfig(): VibeConfig | null {
  const providers = getStoredProvidersList();
  const configuredProviders = providers.filter((p) => p.apiKey?.trim() && p.apiKey !== "***");

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const matchingProvider = configuredProviders.find(
          (p) =>
            p.id === parsed.providerId ||
            (p.baseUrl && parsed.baseUrl && p.baseUrl.replace(/\/+$/, "") === parsed.baseUrl.replace(/\/+$/, "")),
        );
        const configuredProvider = matchingProvider || configuredProviders[0];

        const isPremireOrEmpty =
          !parsed.apiKey ||
          parsed.apiKey === "***" ||
          parsed.providerId === "premire" ||
          parsed.baseUrl?.includes("sysik.mom");

        // If active config is unconfigured Premire AI or has masked/empty key, but user has a configured provider:
        // Automatically switch to the user's configured provider!
        if (isPremireOrEmpty && configuredProvider) {
          parsed.apiKey = configuredProvider.apiKey.trim();
          parsed.providerId = configuredProvider.id || "groq";
          parsed.baseUrl = configuredProvider.baseUrl || "https://api.groq.com/openai/v1";
          parsed.model = configuredProvider.model || getDefaultFlagshipModel(parsed.providerId, parsed.baseUrl);
          try {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
          return parsed;
        }

        if (!parsed.apiKey || parsed.apiKey === "***") {
          const prov =
            providers.find(
              (p) =>
                p.apiKey?.trim() &&
                p.apiKey !== "***" &&
                (p.id === parsed.providerId || p.baseUrl === parsed.baseUrl),
            ) || configuredProvider;
          if (prov) {
            parsed.apiKey = prov.apiKey.trim();
            if (!parsed.providerId || parsed.providerId === "premire") parsed.providerId = prov.id;
            if (!parsed.baseUrl || parsed.baseUrl.includes("sysik.mom")) parsed.baseUrl = prov.baseUrl;
            if (!parsed.model || parsed.model === "sonnet-5") {
              parsed.model = prov.model || getDefaultFlagshipModel(parsed.providerId, parsed.baseUrl);
            }
          }
        }

        // If provider is Groq but model is sonnet-5 or empty or claude, set to llama-3.3-70b-versatile
        if (
          (parsed.providerId === "groq" || parsed.baseUrl?.includes("groq.com")) &&
          (!parsed.model || parsed.model === "sonnet-5" || parsed.model.includes("claude"))
        ) {
          parsed.model = configuredProvider?.model || "llama-3.3-70b-versatile";
        }

        try {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
        return parsed;
      }
    }
  } catch {}

  // Fallback: search stored providers for any provider with an apiKey
  const fallbackProvider = configuredProviders[0];
  if (fallbackProvider) {
    const provId = fallbackProvider.id || "groq";
    const bUrl = fallbackProvider.baseUrl || "https://api.groq.com/openai/v1";
    const cfg: VibeConfig = {
      apiKey: fallbackProvider.apiKey.trim(),
      baseUrl: bUrl,
      model: fallbackProvider.model || getDefaultFlagshipModel(provId, bUrl),
      providerId: provId,
      cwd: "C:/Users/Developer/Desktop/Premire",
      autoApprove: true,
    };
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
    } catch {}
    return cfg;
  }

  return null;
}

export function getCurrentConfig(): VibeConfig | null {
  if (!currentConfig) {
    currentConfig = loadStoredConfig();
  }
  return currentConfig;
}

export function setCurrentConfig(config: VibeConfig | null): void {
  if (config) {
    if (!config.apiKey || config.apiKey === "***") {
      if (currentConfig?.apiKey && currentConfig.apiKey !== "***") {
        config.apiKey = currentConfig.apiKey;
      } else {
        const providers = getStoredProvidersList();
        const found =
          providers.find((p) => p.apiKey?.trim() && p.apiKey !== "***" && (p.id === config.providerId || p.baseUrl === config.baseUrl)) ||
          (config.model ? providers.find((p) => p.apiKey?.trim() && p.apiKey !== "***" && (p.model === config.model || p.customModels?.some((cm: any) => cm.key === config.model))) : null) ||
          providers.find((p) => p.apiKey?.trim() && p.apiKey !== "***");
        if (found) {
          config.apiKey = found.apiKey.trim();
          if (!config.providerId || config.providerId === "premire") config.providerId = found.id;
          if (!config.baseUrl || config.baseUrl.includes("sysik.mom")) config.baseUrl = found.baseUrl;
        }
      }
    }
    if (
      (config.providerId === "groq" || config.baseUrl?.includes("groq.com")) &&
      (!config.model || config.model === "sonnet-5" || config.model.includes("claude"))
    ) {
      config.model = "llama-3.3-70b-versatile";
    }
  }
  currentConfig = config;
  try {
    if (config) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
    }
  } catch {}
}

