import { invoke } from "@tauri-apps/api/core";
import type { KeyValueStore } from "@/platform/storage/common/keyValueStore";

const STORAGE_PREFIX = "premire_kv:";

/** Tauri and LocalStorage hybrid implementation of the platform key-value persistence port. */
export const tauriKeyValueStore: KeyValueStore = {
  get: async (key: string): Promise<string | null> => {
    try {
      const val = await invoke<string | null>("state_get", { key });
      if (val !== null && val !== undefined) {
        try {
          localStorage.setItem(STORAGE_PREFIX + key, val);
        } catch {}
        return val;
      }
    } catch {
      // In web browser or when invoke fails, fallback to localStorage
    }
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch {}
    try {
      await invoke("state_set", { key, value });
    } catch {
      // Offline / browser dev preview fallback
    }
  },
};
