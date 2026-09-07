// Typed Tauri adapter for project persistence commands.
import { invoke } from "@tauri-apps/api/core";
import { browserPreviewProjects } from "@/workbench/browser/desktopPreview";
import { fileService } from "@/workbench/services/files/tauri/fileService";
import type { Project } from "../common/workspace";

const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

const STORAGE_KEY = "premire_browser_projects";
const ACTIVE_KEY = "premire_browser_active_project";

function getBrowserProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [...browserPreviewProjects];
}

function saveBrowserProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {}
}

export const workspaceService = {
  list: async (): Promise<Project[]> => {
    if (isTauri) return invoke<Project[]>("projects_list");
    return getBrowserProjects();
  },
  active: async (): Promise<Project | null> => {
    if (isTauri) return invoke<Project | null>("projects_active");
    const activeId = localStorage.getItem(ACTIVE_KEY);
    const list = getBrowserProjects();
    return list.find((p) => p.id === activeId) ?? list[0] ?? null;
  },
  pickFolder: async (): Promise<string | null> => {
    // 1. Try local dev server / native backend endpoint first (zero browser permission prompts)
    try {
      const res = await fetch("/api/fs/pick_folder");
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.path === "string" && data.path.trim()) {
          return data.path.trim();
        }
        if (data && data.path === null) {
          // User explicitly cancelled or closed the dialog
          return null;
        }
      }
    } catch {}

    // 2. Tauri native dialog
    if (isTauri) {
      try {
        const res = await invoke<string | null>("projects_pick_folder");
        if (res) return res;
      } catch {}

      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({ directory: true, multiple: false });
        if (typeof selected === "string") return selected;
      } catch {}
    }

    return null;
  },
  create: async (name: string, path: string, color?: string, template?: string): Promise<Project | null> => {
    const trimmedPath = path.trim().replace(/[\\/]+$/, "") || "C:/Users/Developer/Desktop/Project";
    const trimmedName = name.trim() || trimmedPath.split(/[\\/]/).pop() || "Project";
    const projColor = color || "#38bdf8";

    try {
      const parentDir = trimmedPath.replace(/[\\/][^\\/]+$/, "");
      const dirName = trimmedPath.split(/[\\/]/).pop() || "Project";
      await fileService.createDir(parentDir, dirName);

      if (template === "react") {
        await fileService.write(
          `${trimmedPath}/package.json`,
          JSON.stringify(
            {
              name: trimmedName.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
              version: "0.1.0",
              private: true,
              type: "module",
              scripts: { dev: "vite", build: "tsc && vite build" },
              dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
            },
            null,
            2,
          ),
        );
        await fileService.createDir(trimmedPath, "src");
        await fileService.write(
          `${trimmedPath}/src/App.tsx`,
          `export default function App() {\n  return (\n    <div style={{ padding: 24, fontFamily: "sans-serif" }}>\n      <h1>Welcome to ${trimmedName}</h1>\n      <p>Created with Premire AI</p>\n    </div>\n  );\n}\n`,
        );
        await fileService.write(`${trimmedPath}/README.md`, `# ${trimmedName}\n\nReact project created with Premire AI.\n`);
      } else if (template === "python") {
        await fileService.write(
          `${trimmedPath}/main.py`,
          `def main():\n    print("Hello from ${trimmedName}!")\n\nif __name__ == "__main__":\n    main()\n`,
        );
        await fileService.write(`${trimmedPath}/requirements.txt`, `# Dependencies\n`);
        await fileService.write(`${trimmedPath}/README.md`, `# ${trimmedName}\n\nPython project created with Premire AI.\n`);
      } else if (template === "node") {
        await fileService.write(
          `${trimmedPath}/package.json`,
          JSON.stringify(
            {
              name: trimmedName.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
              version: "1.0.0",
              main: "index.js",
              scripts: { start: "node index.js" },
            },
            null,
            2,
          ),
        );
        await fileService.write(`${trimmedPath}/index.js`, `console.log("Hello from ${trimmedName}!");\n`);
        await fileService.write(`${trimmedPath}/README.md`, `# ${trimmedName}\n\nNode.js project created with Premire AI.\n`);
      } else {
        await fileService.write(`${trimmedPath}/README.md`, `# ${trimmedName}\n\nProject created with Premire AI.\n`);
      }
    } catch {
      // Best-effort file creation
    }

    if (isTauri) {
      try {
        const p = await invoke<Project | null>("projects_open_path", { path: trimmedPath });
        if (p) {
          if (trimmedName && trimmedName !== p.name) {
            await invoke("projects_rename", { id: p.id, name: trimmedName });
            p.name = trimmedName;
          }
          if (projColor) {
            await invoke("projects_set_color", { id: p.id, color: projColor });
            p.color = projColor;
          }
          return p;
        }
      } catch {}
    }

    const id = `proj-${Date.now().toString(36)}`;
    const newProj: Project = {
      id,
      name: trimmedName,
      path: trimmedPath,
      color: projColor,
      addedAt: Date.now(),
    };

    const list = getBrowserProjects();
    const updated = [newProj, ...list.filter((p) => p.path !== trimmedPath && p.id !== id)];
    saveBrowserProjects(updated);
    localStorage.setItem(ACTIVE_KEY, newProj.id);
    return newProj;
  },
  add: async (): Promise<Project | null> => {
    if (isTauri) return invoke<Project | null>("projects_add");
    return workspaceService.create("Project", `C:/Users/Developer/Desktop/Project-${Date.now().toString(36)}`);
  },
  setActive: async (id: string): Promise<Project | null> => {
    if (isTauri) return invoke<Project | null>("projects_set_active", { id });
    localStorage.setItem(ACTIVE_KEY, id);
    const list = getBrowserProjects();
    return list.find((p) => p.id === id) ?? null;
  },
  remove: async (id: string): Promise<Project | null> => {
    if (isTauri) return invoke<Project | null>("projects_remove", { id });
    const list = getBrowserProjects();
    const updated = list.filter((p) => p.id !== id);
    saveBrowserProjects(updated);
    const activeId = localStorage.getItem(ACTIVE_KEY);
    let next: Project | null = null;
    if (activeId === id) {
      next = updated[0] ?? null;
      if (next) localStorage.setItem(ACTIVE_KEY, next.id);
      else localStorage.removeItem(ACTIVE_KEY);
    } else {
      next = updated.find((p) => p.id === activeId) ?? updated[0] ?? null;
      if (next) localStorage.setItem(ACTIVE_KEY, next.id);
      else localStorage.removeItem(ACTIVE_KEY);
    }
    return next;
  },
  rename: async (id: string, name: string): Promise<void> => {
    if (isTauri) {
      await invoke("projects_rename", { id, name });
    }
    const list = getBrowserProjects();
    const p = list.find((x) => x.id === id);
    if (p) {
      p.name = name;
      saveBrowserProjects(list);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("premire:project-renamed", {
          detail: { id, name },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("vibe:workspace:renamed", {
          detail: { id, name },
        }),
      );
    }
  },
  setColor: async (id: string, color: string): Promise<void> => {
    if (isTauri) return invoke("projects_set_color", { id, color });
    const list = getBrowserProjects();
    const p = list.find((x) => x.id === id);
    if (p) {
      p.color = color;
      saveBrowserProjects(list);
    }
  },
  setIcon: async (id: string, icon: string | null): Promise<void> => {
    if (isTauri) return invoke("projects_set_icon", { id, icon });
    const list = getBrowserProjects();
    const p = list.find((x) => x.id === id);
    if (p) {
      p.icon = icon ?? undefined;
      saveBrowserProjects(list);
    }
  },
  setPhoto: async (id: string, photo: string | null): Promise<void> => {
    if (isTauri) return invoke("projects_set_photo", { id, photo });
    const list = getBrowserProjects();
    const p = list.find((x) => x.id === id);
    if (p) {
      p.photo = photo ?? undefined;
      saveBrowserProjects(list);
    }
  },
  close: async (): Promise<void> => {
    if (isTauri) return invoke("projects_close");
    localStorage.removeItem(ACTIVE_KEY);
  },
};
