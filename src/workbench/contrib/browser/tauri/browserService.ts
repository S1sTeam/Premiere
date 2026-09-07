import { invoke } from "@tauri-apps/api/core";

const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

const safeInvoke = async <T = any>(cmd: string, args?: Record<string, unknown>): Promise<T | undefined> => {
  if (!isTauri) return undefined;
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[browserService] failed to invoke ${cmd}:`, err);
    return undefined;
  }
};

export const browserService = {
  start: () => safeInvoke("browser_start"),
  navigate: (url: string) => safeInvoke("browser_navigate_ui", { url }),
  history: (direction: -1 | 1) => safeInvoke("browser_history_ui", { direction }),
  reload: () => safeInvoke("browser_reload_ui"),
  snapshot: () => safeInvoke("browser_snapshot_ui"),
  resize: (width: number, height: number) => safeInvoke("browser_resize_ui", { width, height }),
  setStreamActive: (active: boolean) => safeInvoke("browser_set_ui_stream_active", { active }),
  tabs: (action: "list" | "new" | "select" | "close", targetId?: string, url?: string) =>
    safeInvoke("browser_tabs_ui", { action, targetId, url }),
  setManualControl: (manual: boolean) => safeInvoke("browser_set_manual_control", { manual }),
  pointer: (kind: "move" | "down" | "up" | "wheel", x: number, y: number, deltaX = 0, deltaY = 0) =>
    safeInvoke("browser_manual_pointer", { kind, x, y, deltaX, deltaY }),
  key: (key: string, text?: string) => safeInvoke("browser_manual_key", { key, text }),
  close: () => safeInvoke("browser_close"),
};
