import type { VibeConfig } from "@/workbench/services/aiProviders/common/aiProvider";
import type { ChatSummary } from "@/workbench/services/chat/common/chat";
import type { Project } from "@/workbench/services/workspace/common/workspace";

/**
 * Browser-only preview used by the Vite development server.
 *
 * The production app always runs inside Tauri. Keeping this check both
 * development-only and Tauri-aware prevents the preview data from leaking into
 * packaged builds or replacing the native runtime during `tauri dev`.
 */
export const isBrowserDevPreview =
  import.meta.env.DEV && typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);

export const browserPreviewConfig: VibeConfig = {
  model: "sonnet-5",
  baseUrl: "https://free.sysik.mom/v1",
  cwd: "C:/Users/Developer/Desktop/Premire",
  autoApprove: true,
  apiKey: "",
  providerId: "premire",
  reasoningEffort: "high",
};

export const browserPreviewProject: Project = {
  id: "dev-preview-premire",
  path: browserPreviewConfig.cwd,
  name: "Premire",
  color: "#3b82f6",
  addedAt: Date.now(),
};

export const browserPreviewProjects: Project[] = [
  browserPreviewProject,
];

export const browserPreviewChatsByProject: Record<string, ChatSummary[]> = {};
