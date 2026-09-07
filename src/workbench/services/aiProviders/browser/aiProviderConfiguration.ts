// Provider configuration use cases (application boundary over the gateway).

import type { Provider } from "../common/aiProvider";
import { aiProviderService } from "../tauri/aiProviderService";

/** Point the agent at a new working directory. */
export function changeWorkingDirectory(cwd: string): Promise<void> {
  return aiProviderService.setCwd(cwd);
}

/** Persist the reasoning effort choice on the backend. */
export function updateReasoningEffort(effort: string | null): Promise<void> {
  return aiProviderService.setReasoningEffort(effort);
}

/**
 * Restore the provider that was active in the previous session and prewarm
 * the enabled-models cache. Returns the restored provider, or null.
 */
export async function restoreLastProvider(): Promise<Provider | null> {
  const [providerList] = await Promise.all([
    aiProviderService.listProviders(),
    // Preload enabled models in background to avoid lazy load on first interaction
    aiProviderService.listEnabledModels().catch(() => []),
  ]);
  if (providerList.length === 0) return null;

  const { getCurrentConfig } = await import("../tauri/aiProviderRuntimeState");
  const storedConfig = getCurrentConfig();

  // 1. Try to match the active provider stored in config if it has an API key
  let active = storedConfig
    ? providerList.find(
        (p) =>
          (p.id === storedConfig.providerId ||
            (p.baseUrl && storedConfig.baseUrl && p.baseUrl.replace(/\/+$/, "") === storedConfig.baseUrl.replace(/\/+$/, ""))) &&
          p.apiKey?.trim() &&
          p.apiKey !== "***",
      )
    : null;

  // 2. If active stored provider has no key or not found, find ANY provider with a valid API key
  if (!active) {
    active = providerList.find((p) => p.apiKey?.trim() && p.apiKey !== "***") || null;
  }

  // 3. Fallback to matching stored provider even without key
  if (!active && storedConfig) {
    active =
      providerList.find(
        (p) =>
          p.id === storedConfig.providerId ||
          (p.baseUrl && storedConfig.baseUrl && p.baseUrl.replace(/\/+$/, "") === storedConfig.baseUrl.replace(/\/+$/, "")),
      ) || null;
  }

  // 4. Fallback to last provider in list
  if (!active) {
    active = providerList[providerList.length - 1]!;
  }

  // Ensure active has a valid model (not empty, and not mismatched like sonnet-5 for Groq)
  if (active) {
    const isGroq = active.id === "groq" || active.baseUrl?.includes("groq.com");
    if (!active.model || (isGroq && (active.model === "sonnet-5" || active.model.includes("claude")))) {
      active.model = isGroq ? "llama-3.3-70b-versatile" : (storedConfig?.model || "gpt-4o");
    }
    void aiProviderService.setProvider(active.apiKey, active.baseUrl, active.model, active.id);
  }

  return active;
}
