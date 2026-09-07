/**
 * Premire Dedicated Reasoning Effort System.
 * Provides professional reasoning levels, custom token budgets, and model compatibility checks.
 */

export type PremireEffortId = "off" | "minimal" | "low" | "medium" | "high" | "max" | "custom";

export interface PremireEffortConfig {
  id: PremireEffortId;
  labelKey: string;
  descriptionKey: string;
  defaultTokens: number;
  openaiValue: string;
  anthropicBudget: number;
}

export const PREMIRE_EFFORT_CONFIGS: Record<PremireEffortId, PremireEffortConfig> = {
  off: {
    id: "off",
    labelKey: "reasoningEffortNone",
    descriptionKey: "reasoningEffortOffDesc",
    defaultTokens: 0,
    openaiValue: "",
    anthropicBudget: 0,
  },
  minimal: {
    id: "minimal",
    labelKey: "reasoningEffortMinimal",
    descriptionKey: "reasoningEffortMinimalDesc",
    defaultTokens: 1024,
    openaiValue: "low",
    anthropicBudget: 1024,
  },
  low: {
    id: "low",
    labelKey: "reasoningEffortLow",
    descriptionKey: "reasoningEffortLowDesc",
    defaultTokens: 2048,
    openaiValue: "low",
    anthropicBudget: 2048,
  },
  medium: {
    id: "medium",
    labelKey: "reasoningEffortMedium",
    descriptionKey: "reasoningEffortMediumDesc",
    defaultTokens: 8192,
    openaiValue: "medium",
    anthropicBudget: 8192,
  },
  high: {
    id: "high",
    labelKey: "reasoningEffortHigh",
    descriptionKey: "reasoningEffortHighDesc",
    defaultTokens: 16384,
    openaiValue: "high",
    anthropicBudget: 16384,
  },
  max: {
    id: "max",
    labelKey: "reasoningEffortMax",
    descriptionKey: "reasoningEffortMaxDesc",
    defaultTokens: 32768,
    openaiValue: "high",
    anthropicBudget: 32768,
  },
  custom: {
    id: "custom",
    labelKey: "reasoningEffortCustom",
    descriptionKey: "reasoningEffortCustomDesc",
    defaultTokens: 16384,
    openaiValue: "high",
    anthropicBudget: 16384,
  },
};

export const PREMIRE_EFFORT_OPTIONS: PremireEffortId[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "max",
  "custom",
];

export const TOKEN_BUDGET_PRESETS = [1024, 2048, 4096, 8192, 16384, 32768, 65536];

/** Known patterns matching models that support reasoning or thinking */
const REASONING_PATTERNS = [
  /^o1/i,
  /^o3/i,
  /^o4/i,
  /o1-/i,
  /o3-/i,
  /o4-/i,
  /reasoner/i,
  /reasoning/i,
  /thinking/i,
  /deepseek-r1/i,
  /claude-3-7/i,
  /claude-3\.7/i,
  /claude-sonnet-4/i,
  /sonnet-5/i,
  /qwq/i,
  /qvq/i,
];

/**
 * Checks if a given model supports reasoning / thinking.
 */
export function isModelReasoningSupported(modelId?: string, providerId?: string): boolean {
  if (!modelId) return false;
  const lower = modelId.toLowerCase();

  for (const pattern of REASONING_PATTERNS) {
    if (pattern.test(lower)) return true;
  }

  const p = (providerId || "").toLowerCase();
  if (p === "deepseek" && (lower.includes("r1") || lower.includes("reasoner"))) {
    return true;
  }

  return false;
}

/**
 * Parses an effort string that might be a mode identifier or custom token count, e.g.:
 * "high", "max", "budget:8192", or "8192".
 */
export function parseEffortValue(raw?: string | null): {
  mode: PremireEffortId;
  tokens: number;
} {
  if (!raw || raw === "off" || raw === "none") {
    return { mode: "off", tokens: 0 };
  }

  if (raw.startsWith("budget:")) {
    const num = parseInt(raw.slice(7), 10);
    return { mode: "custom", tokens: isNaN(num) ? 8192 : num };
  }

  const asNum = parseInt(raw, 10);
  if (!isNaN(asNum) && String(asNum) === raw) {
    return { mode: "custom", tokens: asNum };
  }

  if (raw in PREMIRE_EFFORT_CONFIGS) {
    const mode = raw as PremireEffortId;
    return { mode, tokens: PREMIRE_EFFORT_CONFIGS[mode].defaultTokens };
  }

  // Fallback
  return { mode: "medium", tokens: 8192 };
}

/**
 * Serializes an effort mode and optional token budget into a standard value string.
 */
export function formatEffortValue(mode: PremireEffortId, tokens?: number): string | null {
  if (mode === "off") return null;
  if (mode === "custom" && tokens && tokens > 0) {
    return `budget:${tokens}`;
  }
  return mode;
}
