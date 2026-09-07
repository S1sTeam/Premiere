import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

/** Native window controls exposed to the shell and onboarding flows. */
export const windowApi = {
  startDragging: async (): Promise<void> => {
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // ignore
    }
  },
  minimize: async (): Promise<void> => {
    try {
      await invoke("window_minimize");
      return;
    } catch {
      try {
        await getCurrentWindow().minimize();
        return;
      } catch {
        // ignore
      }
    }
    // Browser fallback: exit fullscreen or blur
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        window.blur();
      }
    } catch {
      // ignore
    }
  },
  maximize: async (): Promise<void> => {
    try {
      await invoke("window_maximize");
      return;
    } catch {
      try {
        const win = getCurrentWindow();
        if (typeof (win as any).maximize === "function") {
          await (win as any).maximize();
        } else {
          await win.toggleMaximize();
        }
        return;
      } catch {
        // ignore
      }
    }
    // Browser fallback (only when user gesture is available)
    try {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
  },
  close: async (): Promise<void> => {
    try {
      await invoke("window_close");
      return;
    } catch {
      try {
        await getCurrentWindow().close();
        return;
      } catch {
        // ignore
      }
    }
    // Browser fallback
    try {
      window.close();
    } catch {
      // ignore
    }
  },
  setSize: async (width: number, height: number): Promise<void> => {
    try {
      await invoke("window_set_size", { width, height });
    } catch {
      // ignore
    }
  },
  setFullscreen: async (fullscreen: boolean): Promise<void> => {
    try {
      await invoke("window_set_fullscreen", { fullscreen });
    } catch {
      // ignore
    }
  },
  zoom: (factor: number): Promise<void> => {
    try {
      return invoke("window_zoom", { factor });
    } catch {
      return Promise.resolve();
    }
  },
};

