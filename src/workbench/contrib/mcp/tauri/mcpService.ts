import { invoke } from "@tauri-apps/api/core";
import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";
import type { McpConfig, McpServerStatus, McpStatus } from "../common/mcp";

const BROWSER_MCP_STORAGE_KEY = "premire_browser_mcp_config";

function getBrowserMcpConfig(): McpConfig {
  try {
    const raw = localStorage.getItem(BROWSER_MCP_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { servers: [] };
}

function saveBrowserMcpConfig(config: McpConfig): void {
  try {
    localStorage.setItem(BROWSER_MCP_STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export async function mcpGetServers(): Promise<McpServerStatus[]> {
  if (isBrowserDevPreview) {
    const cfg = getBrowserMcpConfig();
    const servers = cfg.servers || [];
    return servers.map((s) => ({
      name: s.name,
      status: { type: "stopped" as const },
      enabled: s.enabled !== false,
    }));
  }
  return invoke("mcp_get_servers");
}

export async function mcpStartServer(name: string): Promise<void> {
  if (isBrowserDevPreview) return;
  return invoke("mcp_start_server", { name });
}

export async function mcpStopServer(name: string): Promise<void> {
  if (isBrowserDevPreview) return;
  return invoke("mcp_stop_server", { name });
}

export async function mcpRestartServer(name: string): Promise<void> {
  if (isBrowserDevPreview) return;
  return invoke("mcp_restart_server", { name });
}

export async function mcpGetStatus(name: string): Promise<McpStatus> {
  if (isBrowserDevPreview) return { type: "stopped" };
  return invoke("mcp_get_status", { name });
}

export async function mcpGetConfig(): Promise<McpConfig> {
  if (isBrowserDevPreview) {
    return getBrowserMcpConfig();
  }
  return invoke("mcp_get_config");
}

export async function mcpSaveConfig(config: McpConfig): Promise<void> {
  if (isBrowserDevPreview) {
    saveBrowserMcpConfig(config);
    return;
  }
  return invoke("mcp_save_config", { config });
}

export async function mcpListTools(serverName: string): Promise<string[]> {
  if (isBrowserDevPreview) return [];
  return invoke("mcp_list_tools", { serverName });
}

