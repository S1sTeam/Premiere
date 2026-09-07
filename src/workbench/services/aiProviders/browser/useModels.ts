import { useCallback } from "react";
import { aiProviderService } from "@/workbench/services/aiProviders/tauri/aiProviderService";
import type { Provider, VibeConfig } from "../common/aiProvider";

export function useModels(
  config: VibeConfig | null,
  setConfig: React.Dispatch<React.SetStateAction<VibeConfig | null>>,
  _settingsOpen: boolean,
) {
  const handlePickModel = useCallback(
    async (id: string, providerDbId?: string) => {
      try {
        const providers: Provider[] = await aiProviderService.listProviders();

        // 1. Match provider by providerDbId
        let provider = providerDbId
          ? providers.find(
              (p) =>
                p.id === providerDbId ||
                (providerDbId === "premire" && (p.id === "premire" || p.baseUrl?.includes("sysik.mom"))) ||
                (p.name && p.name.toLowerCase() === providerDbId.toLowerCase()) ||
                (p.baseUrl && p.baseUrl.toLowerCase().includes(providerDbId.toLowerCase())),
            )
          : null;

        // 2. If not found by providerDbId, match provider by model
        if (!provider && id) {
          const lowerId = id.toLowerCase();
          provider =
            providers.find((p) => p.model === id || p.customModels?.some((cm) => cm.key === id)) ||
            providers.find(
              (p) =>
                (p.id === "groq" || p.baseUrl?.includes("groq.com")) &&
                (lowerId.includes("llama") || lowerId.includes("mixtral") || lowerId.includes("gemma")),
            ) ||
            providers.find((p) => p.apiKey?.trim() && p.apiKey !== "***");
        }

        if (provider) {
          await aiProviderService.setProvider(provider.apiKey, provider.baseUrl, id, provider.id);
          setConfig((prev) => ({
            ...(prev || {}),
            model: id,
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            providerId: provider.id,
            cwd: prev?.cwd || "C:/Users/Developer/Desktop/Premire",
            autoApprove: prev?.autoApprove ?? false,
          }));
          return;
        } else if (providerDbId === "premire") {
          const premireProv = providers.find((p) => p.id === "premire" || p.baseUrl?.includes("sysik.mom"));
          const baseUrl = premireProv?.baseUrl || "https://free.sysik.mom/v1";
          const apiKey = premireProv?.apiKey || config?.apiKey || "";
          await aiProviderService.setProvider(apiKey, baseUrl, id, "premire");
          setConfig((prev) => ({
            ...(prev || {}),
            model: id,
            baseUrl,
            apiKey,
            providerId: "premire",
            cwd: prev?.cwd || "C:/Users/Developer/Desktop/Premire",
            autoApprove: prev?.autoApprove ?? false,
          }));
          return;
        }
      } catch (err) {
        console.warn("handlePickModel error:", err);
      }

      await aiProviderService.setModel(id);
      setConfig((prev) => (prev ? { ...prev, model: id } : prev));
    },
    [config, setConfig],
  );

  return {
    handlePickModel,
  };
}
