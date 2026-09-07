// Typed Tauri adapter for terminal session commands.
import { invoke } from "@tauri-apps/api/core";
import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";
import type { TerminalDataEvent, TerminalExitEvent } from "../common/terminal";

const terminalBuffers = new Map<string, string>();

export const terminalService = {
  start: async (id: string, cols: number, rows: number): Promise<boolean> => {
    if (isBrowserDevPreview) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("vibe:term:data", {
            detail: {
              id,
              data: "\r\n\x1b[1;37m  PREMIRE\x1b[0m \x1b[90m— Terminal\x1b[0m\r\n  Repository: C:\\Users\\Developer\\Desktop\\Premire\r\n  Type \x1b[36m'help'\x1b[0m for available commands.\r\n\r\n\x1b[32mpremire>\x1b[0m ",
            },
          }),
        );
      }, 60);
      terminalBuffers.set(id, "");
      return true;
    }
    return invoke<boolean>("term_start", { id, cols, rows });
  },

  write: async (id: string, data: string): Promise<void> => {
    if (isBrowserDevPreview) {
      const buf = terminalBuffers.get(id) ?? "";
      if (data === "\r" || data === "\n") {
        const cmd = buf.trim();
        terminalBuffers.set(id, "");
        let output = "\r\n";
        if (cmd === "help") {
          output += "  \x1b[1mAvailable commands:\x1b[0m\r\n  - \x1b[36mstatus\x1b[0m: Check Premire system & AI status\r\n  - \x1b[36mmodels\x1b[0m: Check available AI models\r\n  - \x1b[36mclear\x1b[0m: Clear terminal screen\r\n  - \x1b[36mexit\x1b[0m: Close terminal session\r\n";
        } else if (cmd === "clear" || cmd === "cls") {
          output += "\x1b[2J\x1b[H";
        } else if (cmd === "status") {
          output += "  [Premire] Engine: Ready | API: https://free.sysik.mom/v1 | Status: Online\r\n";
        } else if (cmd === "models") {
          output += "  [Premire AI] 77 models available via https://free.sysik.mom/v1/models\r\n";
        } else if (cmd.length > 0) {
          output += `  [Premire Shell] ${cmd}: Command executed.\r\n`;
        }
        output += "\x1b[32mpremire>\x1b[0m ";
        window.dispatchEvent(
          new CustomEvent("vibe:term:data", {
            detail: { id, data: output },
          }),
        );
      } else if (data === "\x7f" || data === "\b") {
        if (buf.length > 0) {
          terminalBuffers.set(id, buf.slice(0, -1));
          window.dispatchEvent(
            new CustomEvent("vibe:term:data", {
              detail: { id, data: "\b \b" },
            }),
          );
        }
      } else {
        terminalBuffers.set(id, buf + data);
        window.dispatchEvent(
          new CustomEvent("vibe:term:data", {
            detail: { id, data },
          }),
        );
      }
      return;
    }
    return invoke("term_write", { id, data });
  },

  resize: (id: string, cols: number, rows: number): Promise<void> => {
    if (isBrowserDevPreview) return Promise.resolve();
    return invoke("term_resize", { id, cols, rows });
  },

  kill: (id: string): Promise<void> => {
    if (isBrowserDevPreview) {
      terminalBuffers.delete(id);
      return Promise.resolve();
    }
    return invoke("term_kill", { id });
  },

  onData: (cb: (payload: TerminalDataEvent) => void): (() => void) => {
    const handler = (e: Event) => cb((e as CustomEvent<TerminalDataEvent>).detail);
    window.addEventListener("vibe:term:data", handler);
    return () => window.removeEventListener("vibe:term:data", handler);
  },

  onExit: (cb: (payload: TerminalExitEvent) => void): (() => void) => {
    const handler = (e: Event) => cb((e as CustomEvent<TerminalExitEvent>).detail);
    window.addEventListener("vibe:term:exit", handler);
    return () => window.removeEventListener("vibe:term:exit", handler);
  },
};
