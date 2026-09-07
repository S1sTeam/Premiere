import type React from "react";
import { useState } from "react";
import { useTheme } from "@/platform/theme/themeService";
import { getProviderIconPath, getProviderIconUrl } from "@/workbench/services/aiProviders/browser/providerTemplates";

interface ProviderLogoProps {
  icon?: string | null;
  providerId?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Detects the originating provider/vendor ID from a model name or ID.
 * e.g., 'gemini-2.5-flash' -> 'google', 'glm-4-plus' -> 'zai', 'claude-3-7-sonnet' -> 'anthropic', etc.
 */
export function getModelProviderId(modelId?: string, modelName?: string, fallbackProviderId?: string): string {
  const s = `${modelId || ""} ${modelName || ""}`.toLowerCase();
  if (s.includes("gemini")) return "google";
  if (s.includes("glm") || s.includes("chatglm") || s.includes("zhipu") || s.includes("z.ai") || s.includes("zai")) return "zai";
  if (s.includes("claude") || s.includes("sonnet") || s.includes("haiku") || s.includes("opus")) return "anthropic";
  if (s.includes("gpt") || s.includes("o1") || s.includes("o3") || s.includes("o4") || s.includes("chatgpt") || s.includes("dall-e") || s.includes("text-embedding")) return "openai";
  if (s.includes("deepseek")) return "deepseek";
  if (s.includes("grok") || s.includes("xai")) return "xai";
  if (s.includes("qwen") || s.includes("qianwen") || s.includes("alibaba")) return "qwen";
  if (s.includes("mistral") || s.includes("codestral") || s.includes("mixtral") || s.includes("pixtral")) return "mistral";
  if (s.includes("llama") || s.includes("meta")) return "ollama";
  if (s.includes("moonshot") || s.includes("kimi")) return "moonshot";
  if (s.includes("minimax") || s.includes("abab")) return "minimax";
  if (s.includes("cohere") || s.includes("command")) return "cohere";
  if (s.includes("perplexity") || s.includes("sonar")) return "perplexity";
  if (s.includes("yi-") || s.includes("01-ai")) return "01-ai";

  if (fallbackProviderId && fallbackProviderId !== "custom" && fallbackProviderId !== "premire") return fallbackProviderId;
  return "premire";
}

export function ProviderLogo({
  icon,
  providerId,
  className = "settings__provider-icon",
  style,
  alt = "",
}: ProviderLogoProps): React.ReactElement | null {
  const { resolvedScheme } = useTheme();
  const [useFallback, setUseFallback] = useState(false);

  const [loadFailed, setLoadFailed] = useState(false);

  const rawIcon = icon || providerId || "";
  if (!rawIcon) return null;

  if (rawIcon.startsWith("data:")) {
    return <img src={rawIcon} className={className} style={style} alt={alt} />;
  }

  const isLight = resolvedScheme === "light";
  const primaryUrl = getProviderIconUrl(rawIcon, isLight);
  const fallbackUrl = getProviderIconPath(rawIcon, isLight);

  let src = useFallback ? fallbackUrl : primaryUrl;
  if (src && !src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:") && !src.startsWith("/")) {
    src = "/" + src;
  }
  const isRemote = src.startsWith("http://") || src.startsWith("https://");

  const computedStyle: React.CSSProperties = {
    ...style,
    ...(isRemote && !isLight ? { filter: "brightness(0) invert(1)" } : {}),
  };

  if (loadFailed) {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          opacity: 0.85,
          ...style,
        }}
        title={alt || rawIcon}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={src}
      className={className}
      style={computedStyle}
      alt={alt}
      onError={() => {
        if (!useFallback) {
          setUseFallback(true);
        } else {
          setLoadFailed(true);
        }
      }}
    />
  );
}
