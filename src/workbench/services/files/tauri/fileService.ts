// Typed Tauri adapter for filesystem commands (owned by the files feature).
import { invoke } from "@tauri-apps/api/core";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";
import { type Result, wrap } from "@/platform/native/common/nativeResult";
import type { FileMatch, FsEntry } from "../common/files";

export const fileService = {
  list: (dir: string): Promise<Result<{ entries: FsEntry[] }>> => {
    if (isBrowserDevPreview) {
      return fetch(`/api/fs/list?dir=${encodeURIComponent(dir)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((entries) => ({ ok: true as const, entries }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke<FsEntry[]>("fs_list", { dir }),
      (entries) => ({ entries }),
    );
  },

  reveal: async (path: string): Promise<void> => {
    try {
      const res = await fetch("/api/fs/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (res.ok) return;
    } catch {}

    try {
      await invoke("fs_reveal", { path });
      return;
    } catch {}

    try {
      await shellOpen(path);
    } catch {
      /* ignore */
    }
  },


  read: (path: string): Promise<Result<{ content: string }>> => {
    if (isBrowserDevPreview) {
      return fetch(`/api/fs/read?path=${encodeURIComponent(path)}`)
        .then((res) => (res.ok ? res.json() : ""))
        .then((content) => ({ ok: true as const, content }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke<string>("fs_read", { path }),
      (content) => ({ content }),
    );
  },

  readBinary: (path: string): Promise<Result<{ data: string; size: number }>> =>
    wrap(
      () => invoke<{ data: string; size: number }>("fs_read_binary", { path }),
      (r) => r,
    ),

  write: (path: string, content: string): Promise<Result<object>> => {
    if (isBrowserDevPreview) {
      return fetch("/api/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      })
        .then(() => ({ ok: true as const, data: {} }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke("fs_write", { path, content }),
      () => ({}),
    );
  },

  rename: (from: string, to: string): Promise<Result<object>> => {
    if (isBrowserDevPreview) {
      return fetch("/api/fs/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      })
        .then(() => ({ ok: true as const, data: {} }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke("fs_rename", { from, to }),
      () => ({}),
    );
  },

  delete: (filePath: string): Promise<Result<object>> => {
    if (isBrowserDevPreview) {
      return fetch("/api/fs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath }),
      })
        .then(() => ({ ok: true as const, data: {} }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke("fs_delete", { path: filePath }),
      () => ({}),
    );
  },

  createFile: (dir: string, name: string): Promise<Result<{ path: string }>> => {
    if (isBrowserDevPreview) {
      return fetch("/api/fs/create_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir, name }),
      })
        .then((res) => res.json())
        .then((path) => ({ ok: true as const, path }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke<string>("fs_create_file", { dir, name }),
      (path) => ({ path }),
    );
  },

  createDir: (dir: string, name: string): Promise<Result<{ path: string }>> => {
    if (isBrowserDevPreview) {
      return fetch("/api/fs/create_dir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir, name }),
      })
        .then((res) => res.json())
        .then((path) => ({ ok: true as const, path }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke<string>("fs_create_dir", { dir, name }),
      (path) => ({ path }),
    );
  },

  find: (root: string, query: string, limit?: number): Promise<Result<{ matches: FileMatch[] }>> => {
    if (isBrowserDevPreview) {
      const params = new URLSearchParams({
        root,
        query,
        limit: String(limit ?? 30),
      });
      return fetch(`/api/fs/find?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : { matches: [] }))
        .then((data) => ({ ok: true as const, ...data }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke<FileMatch[]>("fs_find", { root, query, limit }),
      (matches) => ({ matches }),
    );
  },

  findAll: (root: string, query: string, limit?: number): Promise<Result<{ matches: FileMatch[] }>> => {
    if (isBrowserDevPreview) {
      const params = new URLSearchParams({
        root,
        query,
        limit: String(limit ?? 50),
      });
      return fetch(`/api/fs/find_all?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : { matches: [] }))
        .then((data) => ({ ok: true as const, ...data }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () => invoke<FileMatch[]>("fs_find_all", { root, query, limit }),
      (matches) => ({ matches }),
    );
  },

  projectInfo: (dir: string): Promise<Result<{ name: string | null; version: string | null }>> => {
    if (isBrowserDevPreview) {
      return fetch(`/api/fs/project_info?dir=${encodeURIComponent(dir)}`)
        .then((res) => (res.ok ? res.json() : { name: "Premire", version: "1.0.0" }))
        .then((r) => ({ ok: true as const, ...r }))
        .catch(() => ({ ok: true as const, name: "Premire", version: "1.0.0" }));
    }
    return wrap(
      () => invoke<{ name: string | null; version: string | null }>("fs_project_info", { dir }),
      (r) => r,
    );
  },
};

/** Open a native folder picker; returns the chosen path or null. */
export async function pickWorkspaceFolder(): Promise<string | null> {
  if (isBrowserDevPreview) {
    return "C:/Users/Developer/Desktop/Premire";
  }
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const folder = await open({ directory: true, multiple: false });
    return typeof folder === "string" ? folder : null;
  } catch {
    return null;
  }
}

/** Subscribe to backend filesystem-change notifications. */
export function onFsChanged(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("vibe:fs:changed", handler);
  return () => window.removeEventListener("vibe:fs:changed", handler);
}
