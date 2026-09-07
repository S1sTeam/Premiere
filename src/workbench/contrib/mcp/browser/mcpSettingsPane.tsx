import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Toggle } from "@zazaru/ui";
import { useI18n } from "@/platform/localization/localizationService";
import type { McpConfig, McpServerConfig, McpServerStatus } from "../common/mcp";
import {
  mcpGetConfig,
  mcpGetServers,
  mcpSaveConfig,
  mcpStartServer,
  mcpStopServer,
  mcpRestartServer,
  mcpListTools,
} from "../tauri/mcpService";

interface PresetTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  icon: string;
}

const MCP_PRESETS: PresetTemplate[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    badge: "Official",
    description: "Безопасный доступ к чтению, записи и анализу файлов на локальном диске",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\Developer\\Desktop"],
    icon: "folder",
  },
  {
    id: "context7",
    name: "Context7",
    badge: "Docs",
    description: "Поиск актуальной документации, примеров кода и API библиотек",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp"],
    icon: "book",
  },
  {
    id: "github",
    name: "GitHub",
    badge: "Official",
    description: "Управление репозиториями, чтение issues, pull requests и поиск кода",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
    icon: "github",
  },
  {
    id: "memory",
    name: "Memory (Knowledge Graph)",
    badge: "Context",
    description: "Долговременная графовая память сущностей и связей для контекста ассистента",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    icon: "brain",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    badge: "Database",
    description: "Инспекция схемы базы данных и выполнение аналитических SQL-запросов",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/mydb"],
    icon: "database",
  },
  {
    id: "fetch",
    name: "Fetch & Web",
    badge: "Official",
    description: "Загрузка веб-страниц и конвертация HTML в чистый Markdown",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    icon: "globe",
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    badge: "Browser",
    description: "Автоматизация веб-браузера, рендеринг JS-страниц и снятие скриншотов",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    icon: "browser",
  },
  {
    id: "sqlite",
    name: "SQLite",
    badge: "Database",
    description: "Работа с локальными файлами баз данных SQLite и просмотр таблиц",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "local.db"],
    icon: "database",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    badge: "Search",
    description: "Глобальный веб-поиск и поиск локальных данных через Brave API",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: { BRAVE_API_KEY: "" },
    icon: "search",
  },
];

function ServerIconSvg({ type }: { type?: string }) {
  switch (type) {
    case "folder":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "database":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case "globe":
    case "browser":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "brain":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
        </svg>
      );
    case "book":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      );
  }
}

export function McpSettingsPane(): React.ReactElement {
  const { lang } = useI18n();
  const isRu = lang === "Russian";

  const [config, setConfig] = useState<McpConfig>({ servers: [] });
  const [statuses, setStatuses] = useState<McpServerStatus[]>([]);
  const [activeTab, setActiveTab] = useState<"servers" | "presets" | "raw">("servers");
  const [searchQuery, setSearchQuery] = useState("");
  const [rawToml, setRawToml] = useState<string>("");
  const [_isRawValid, _setIsRawValid] = useState<boolean>(true);

  // Inspector & Restart feedback states
  const [toolsMap, setToolsMap] = useState<Record<string, string[]>>({});
  const [expandedToolsServer, setExpandedToolsServer] = useState<string | null>(null);
  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});
  const [restartingServers, setRestartingServers] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);
  const [formName, setFormName] = useState("");
  const [formCommand, setFormCommand] = useState("");
  const [formArgs, setFormArgs] = useState("");
  const [formEnv, setFormEnv] = useState<{ key: string; value: string }[]>([]);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formError, setFormError] = useState("");

  const showNotice = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const getServers = useCallback((cfg?: McpConfig | null): McpServerConfig[] => {
    if (!cfg) return [];
    return cfg.servers || (cfg as any).server || [];
  }, []);

  const loadData = useCallback(async () => {
    try {
      const cfg = await mcpGetConfig();
      const servers = getServers(cfg);
      setConfig({ servers });
      const st = await mcpGetServers();
      setStatuses(st || []);

      // Generate clean TOML
      let tomlStr = "# Premire MCP Servers Configuration\n[mcp]\n\n";
      for (const s of servers) {
        tomlStr += `[[mcp.server]]\nname = "${s.name}"\ncommand = "${s.command}"\nargs = ${JSON.stringify(s.args || [])}\n`;
        if (s.env && Object.keys(s.env).length > 0) {
          tomlStr += `env = ${JSON.stringify(s.env, null, 2)}\n`;
        }
        tomlStr += `enabled = ${s.enabled}\n\n`;
      }
      setRawToml(tomlStr);
    } catch (e) {
      console.error("Failed to load MCP data:", e);
    }
  }, [getServers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleServer = async (name: string, enable: boolean) => {
    const serversList = getServers(config);
    const updatedServers = serversList.map((s) => (s.name === name ? { ...s, enabled: enable } : s));
    const newConfig = { ...config, servers: updatedServers };
    setConfig(newConfig);
    try {
      await mcpSaveConfig(newConfig);
      if (enable) {
        await mcpStartServer(name);
        showNotice(isRu ? `Сервер "${name}" запущен` : `Server "${name}" started`);
      } else {
        await mcpStopServer(name);
        showNotice(isRu ? `Сервер "${name}" остановлен` : `Server "${name}" stopped`);
      }
      loadData();
    } catch (e) {
      console.error("Failed to toggle MCP server:", e);
      showNotice(String(e), "error");
    }
  };

  const handleRestart = async (name: string) => {
    setRestartingServers((prev) => ({ ...prev, [name]: true }));
    try {
      await mcpRestartServer(name);
      showNotice(isRu ? `Сервер "${name}" перезапущен` : `Server "${name}" restarted`);
      await loadData();
      if (expandedToolsServer === name) {
        handleInspectTools(name);
      }
    } catch (e) {
      showNotice(String(e), "error");
    } finally {
      setRestartingServers((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleInspectTools = async (serverName: string) => {
    if (expandedToolsServer === serverName) {
      setExpandedToolsServer(null);
      return;
    }
    setExpandedToolsServer(serverName);
    setLoadingTools((prev) => ({ ...prev, [serverName]: true }));
    try {
      const tools = await mcpListTools(serverName);
      setToolsMap((prev) => ({ ...prev, [serverName]: tools || [] }));
    } catch {
      setToolsMap((prev) => ({ ...prev, [serverName]: [] }));
    } finally {
      setLoadingTools((prev) => ({ ...prev, [serverName]: false }));
    }
  };

  const handleDeleteServer = async (name: string) => {
    const confirmMsg = isRu ? `Удалить MCP-сервер "${name}"?` : `Delete MCP server "${name}"?`;
    if (!confirm(confirmMsg)) return;

    const serversList = getServers(config);
    const updatedServers = serversList.filter((s) => s.name !== name);
    const newConfig = { ...config, servers: updatedServers };
    try {
      await mcpStopServer(name);
      await mcpSaveConfig(newConfig);
      showNotice(isRu ? `Сервер "${name}" удален` : `Server "${name}" deleted`);
      loadData();
    } catch (e) {
      showNotice(String(e), "error");
    }
  };

  const openAddModal = (preset?: PresetTemplate) => {
    setEditingServer(null);
    if (preset) {
      setFormName(preset.id);
      setFormCommand(preset.command);
      setFormArgs(preset.args.join(" "));
      setFormEnv(Object.entries(preset.env || {}).map(([key, value]) => ({ key, value })));
    } else {
      setFormName("");
      setFormCommand("");
      setFormArgs("");
      setFormEnv([]);
    }
    setFormEnabled(true);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (server: McpServerConfig) => {
    setEditingServer(server);
    setFormName(server.name);
    setFormCommand(server.command);
    setFormArgs((server.args || []).join(" "));
    setFormEnv(Object.entries(server.env || {}).map(([key, value]) => ({ key, value })));
    setFormEnabled(server.enabled);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveForm = async () => {
    if (!formName.trim()) {
      setFormError(isRu ? "Введите уникальное имя сервера" : "Server name is required");
      return;
    }
    if (!formCommand.trim()) {
      setFormError(isRu ? "Укажите команду запуска" : "Launch command is required");
      return;
    }

    const serversList = getServers(config);
    if (!editingServer || editingServer.name !== formName.trim()) {
      if (serversList.some((s) => s.name.toLowerCase() === formName.trim().toLowerCase())) {
        setFormError(isRu ? "Сервер с таким именем уже существует" : "Server with this name already exists");
        return;
      }
    }

    const argsList = formArgs
      .trim()
      .split(/\s+/)
      .filter((a) => a.length > 0);

    const envMap: Record<string, string> = {};
    for (const item of formEnv) {
      if (item.key.trim()) {
        envMap[item.key.trim()] = item.value;
      }
    }

    const serverObj: McpServerConfig = {
      name: formName.trim(),
      command: formCommand.trim(),
      args: argsList,
      env: envMap,
      enabled: formEnabled,
    };

    let updatedServers: McpServerConfig[];
    if (editingServer) {
      updatedServers = serversList.map((s) => (s.name === editingServer.name ? serverObj : s));
    } else {
      updatedServers = [...serversList, serverObj];
    }

    const newConfig = { ...config, servers: updatedServers };
    try {
      await mcpSaveConfig(newConfig);
      if (formEnabled) {
        await mcpStartServer(serverObj.name);
      }
      setIsModalOpen(false);
      showNotice(
        editingServer
          ? (isRu ? `Сервер "${serverObj.name}" обновлен` : `Server "${serverObj.name}" updated`)
          : (isRu ? `Сервер "${serverObj.name}" добавлен` : `Server "${serverObj.name}" added`)
      );
      loadData();
    } catch (e) {
      setFormError(String(e));
    }
  };

  const handleSaveRaw = async () => {
    try {
      const newServers: McpServerConfig[] = [];
      const blocks = rawToml.split("[[mcp.server]]");
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
        const cmdMatch = block.match(/command\s*=\s*"([^"]+)"/);
        if (nameMatch && cmdMatch) {
          newServers.push({
            name: nameMatch[1],
            command: cmdMatch[1],
            args: [],
            env: {},
            enabled: !block.includes("enabled = false"),
          });
        }
      }
      await mcpSaveConfig({ servers: newServers });
      showNotice(isRu ? "Конфигурация успешно сохранена" : "Configuration saved successfully");
      loadData();
      setActiveTab("servers");
    } catch (e) {
      showNotice(String(e), "error");
    }
  };

  const handleExport = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config, null, 2))}`;
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = "mcp-config.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showNotice(isRu ? "Конфигурация экспортирована в JSON" : "Configuration exported to JSON");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        const servers = imported.servers || imported.server;
        if (Array.isArray(servers)) {
          await mcpSaveConfig({ servers });
          showNotice(isRu ? "Конфигурация успешно импортирована" : "Configuration imported successfully");
          loadData();
        } else {
          showNotice(isRu ? "Неверный формат файла JSON" : "Invalid JSON format", "error");
        }
      } catch (_err) {
        showNotice(isRu ? "Ошибка парсинга JSON" : "Failed to parse JSON", "error");
      }
    };
    reader.readAsText(file);
  };

  const currentServers = getServers(config);

  const filteredServers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentServers;
    return currentServers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.command.toLowerCase().includes(q) ||
        (s.args || []).some((a) => a.toLowerCase().includes(q))
    );
  }, [currentServers, searchQuery]);

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return MCP_PRESETS;
    return MCP_PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const stats = useMemo(() => {
    let running = 0;
    let stopped = 0;
    let error = 0;
    for (const s of currentServers) {
      if (!s.enabled) {
        stopped++;
        continue;
      }
      const st = statuses.find((item) => item.name === s.name);
      const statusType = typeof st?.status === "string" ? st.status : st?.status?.type;
      if (statusType === "running") running++;
      else if (statusType === "error") error++;
      else stopped++;
    }
    return { total: currentServers.length, running, stopped, error };
  }, [currentServers, statuses]);

  const getStatusInfo = (server: McpServerConfig) => {
    if (!server.enabled) {
      return { dot: "gray", label: isRu ? "Отключен" : "Disabled" };
    }
    const st = statuses.find((s) => s.name === server.name);
    const statusType = typeof st?.status === "string" ? st.status : st?.status?.type;
    if (statusType === "running") return { dot: "green", label: isRu ? "Работает" : "Running" };
    if (statusType === "starting") return { dot: "yellow", label: isRu ? "Запуск..." : "Starting" };
    if (statusType === "error") return { dot: "red", label: isRu ? "Ошибка" : "Error" };
    return { dot: "gray", label: isRu ? "Остановлен" : "Stopped" };
  };

  return (
    <div className="mcp-hub">
      {/* Toast Notice */}
      {notification && (
        <div className={`mcp-toast mcp-toast--${notification.type}`}>
          <span>{notification.text}</span>
          <button type="button" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* Header Metric Cards */}
      <div className="mcp-metrics-bar">
        <div className="mcp-metric-card">
          <span className="mcp-metric-num">{stats.total}</span>
          <span className="mcp-metric-label">{isRu ? "Всего серверов" : "Total Servers"}</span>
        </div>
        <div className="mcp-metric-card mcp-metric-card--green">
          <span className="mcp-metric-num">{stats.running}</span>
          <span className="mcp-metric-label">{isRu ? "Активно" : "Running"}</span>
        </div>
        <div className="mcp-metric-card mcp-metric-card--yellow">
          <span className="mcp-metric-num">{stats.stopped}</span>
          <span className="mcp-metric-label">{isRu ? "Остановлено" : "Stopped"}</span>
        </div>
        {stats.error > 0 && (
          <div className="mcp-metric-card mcp-metric-card--red">
            <span className="mcp-metric-num">{stats.error}</span>
            <span className="mcp-metric-label">{isRu ? "Ошибки" : "Errors"}</span>
          </div>
        )}
      </div>

      {/* Main Toolbar */}
      <div className="mcp-controls-bar">
        <div className="mcp-tabs-track">
          <button
            type="button"
            className={`mcp-tab-btn ${activeTab === "servers" ? "active" : ""}`}
            onClick={() => setActiveTab("servers")}
          >
            <span>{isRu ? "Серверы" : "Installed Servers"}</span>
            <span className="mcp-tab-badge">{currentServers.length}</span>
          </button>
          <button
            type="button"
            className={`mcp-tab-btn ${activeTab === "presets" ? "active" : ""}`}
            onClick={() => setActiveTab("presets")}
          >
            <span>{isRu ? "Каталог шаблонов" : "Templates & Presets"}</span>
            <span className="mcp-tab-badge">{MCP_PRESETS.length}</span>
          </button>
          <button
            type="button"
            className={`mcp-tab-btn ${activeTab === "raw" ? "active" : ""}`}
            onClick={() => setActiveTab("raw")}
          >
            <span>{isRu ? "Конфигурация" : "Configuration"}</span>
          </button>
        </div>

        <div className="mcp-actions-track">
          <button type="button" className="mcp-btn mcp-btn--secondary" onClick={() => loadData()} title={isRu ? "Обновить" : "Refresh"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isRu ? "Обновить" : "Refresh"}</span>
          </button>

          <button type="button" className="mcp-btn mcp-btn--secondary" onClick={handleExport} title={isRu ? "Экспорт JSON" : "Export JSON"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{isRu ? "Экспорт" : "Export"}</span>
          </button>

          <label className="mcp-btn mcp-btn--secondary" title={isRu ? "Импорт JSON" : "Import JSON"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{isRu ? "Импорт" : "Import"}</span>
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>

          <button type="button" className="mcp-btn mcp-btn--primary" onClick={() => openAddModal()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{isRu ? "Добавить сервер" : "Add Server"}</span>
          </button>
        </div>
      </div>

      {/* Filter search bar for servers or presets */}
      {activeTab !== "raw" && (
        <div className="mcp-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="mcp-search-field"
            placeholder={
              activeTab === "servers"
                ? (isRu ? "Поиск по подключенным MCP-серверам..." : "Search installed MCP servers...")
                : (isRu ? "Поиск по каталогу готовых шаблонов..." : "Search ready-to-use presets...")
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="mcp-search-clear" onClick={() => setSearchQuery("")}>✕</button>
          )}
        </div>
      )}

      {/* TAB 1: INSTALLED SERVERS */}
      {activeTab === "servers" && (
        <div className="mcp-servers-grid">
          {filteredServers.length === 0 ? (
            <div className="mcp-empty-state">
              <ServerIconSvg />
              <h4>{isRu ? "Нет настроенных MCP-серверов" : "No MCP Servers Configured"}</h4>
              <p>
                {isRu
                  ? "Добавьте собственный сервер или выберите готовый пресет из каталога для подключения файловой системы, баз данных или веб-инструментов."
                  : "Add your own server or pick a ready template from the catalog to enable tools for filesystem, databases, and web."}
              </p>
              <button type="button" className="mcp-btn mcp-btn--primary" onClick={() => setActiveTab("presets")}>
                {isRu ? "Перейти в каталог шаблонов" : "Browse Template Catalog"}
              </button>
            </div>
          ) : (
            filteredServers.map((server) => {
              const status = getStatusInfo(server);
              const commandStr = [server.command, ...(server.args || [])].filter(Boolean).join(" ");
              const isRestarting = Boolean(restartingServers[server.name]);
              const isExpanded = expandedToolsServer === server.name;
              const tools = toolsMap[server.name] || [];
              const isLoadingTools = Boolean(loadingTools[server.name]);

              return (
                <div key={server.name} className={`mcp-server-card ${!server.enabled ? "mcp-server-card--disabled" : ""}`}>
                  <div className="mcp-server-card__top">
                    <div className="mcp-server-card__brand">
                      <div className="mcp-server-card__avatar">
                        <ServerIconSvg />
                      </div>
                      <div className="mcp-server-card__title-col">
                        <div className="mcp-server-card__name-row">
                          <h4 className="mcp-server-card__name">{server.name}</h4>
                          <span className={`mcp-status-pill mcp-status-pill--${status.dot}`}>
                            <span className="mcp-status-dot" />
                            {status.label}
                          </span>
                        </div>
                        <div className="mcp-server-card__cmd-badge" title={commandStr}>
                          <code>{commandStr}</code>
                        </div>
                      </div>
                    </div>

                    <div className="mcp-server-card__actions">
                      <Toggle
                        checked={server.enabled}
                        onValueChange={(checked) => handleToggleServer(server.name, checked)}
                        title={server.enabled ? (isRu ? "Отключить сервер" : "Disable Server") : (isRu ? "Включить сервер" : "Enable Server")}
                      />

                      <button
                        type="button"
                        className={`mcp-card-btn ${isRestarting ? "spinning" : ""}`}
                        onClick={() => handleRestart(server.name)}
                        title={isRu ? "Перезапустить сервер" : "Restart Server"}
                        disabled={!server.enabled || isRestarting}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 4v6h-6" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className={`mcp-card-btn ${isExpanded ? "active" : ""}`}
                        onClick={() => handleInspectTools(server.name)}
                        title={isRu ? "Список инструментов" : "Inspect Tools"}
                        disabled={!server.enabled}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="mcp-card-btn"
                        onClick={() => openEditModal(server)}
                        title={isRu ? "Редактировать" : "Edit"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="mcp-card-btn mcp-card-btn--danger"
                        onClick={() => handleDeleteServer(server.name)}
                        title={isRu ? "Удалить" : "Delete"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Tools Inspector */}
                  {isExpanded && (
                    <div className="mcp-server-card__tools-drawer">
                      <div className="mcp-tools-header">
                        <span className="mcp-tools-title">
                          {isRu ? "Доступные инструменты (Tools):" : "Available Tools:"}
                        </span>
                        {isLoadingTools && <span className="mcp-tools-loading">{isRu ? "Загрузка..." : "Loading..."}</span>}
                      </div>
                      {!isLoadingTools && tools.length === 0 ? (
                        <div className="mcp-tools-empty">
                          {isRu ? "Сервер не предоставил инструментов или ещё запускается." : "No tools exposed by this server or server is still starting."}
                        </div>
                      ) : (
                        <div className="mcp-tools-chips">
                          {tools.map((toolName) => (
                            <span key={toolName} className="mcp-tool-chip">
                              <span className="mcp-tool-chip-dot" />
                              {toolName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: TEMPLATES & PRESETS */}
      {activeTab === "presets" && (
        <div className="mcp-presets-grid">
          {filteredPresets.map((preset) => {
            const isInstalled = currentServers.some((s) => s.name.toLowerCase() === preset.id.toLowerCase());

            return (
              <div key={preset.id} className="mcp-preset-card">
                <div className="mcp-preset-card__top">
                  <div className="mcp-preset-card__icon">
                    <ServerIconSvg type={preset.icon} />
                  </div>
                  <span className="mcp-preset-badge">{preset.badge}</span>
                </div>

                <h4 className="mcp-preset-title">{preset.name}</h4>
                <p className="mcp-preset-desc">{preset.description}</p>

                <div className="mcp-preset-code">
                  <code>{preset.command} {preset.args.slice(0, 2).join(" ")}...</code>
                </div>

                <div className="mcp-preset-card__footer">
                  {isInstalled ? (
                    <span className="mcp-preset-installed-tag">
                      ✓ {isRu ? "Установлен" : "Installed"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="mcp-btn mcp-btn--secondary mcp-btn--full"
                      onClick={() => openAddModal(preset)}
                    >
                      {isRu ? "Настроить и подключить" : "Configure & Add"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: RAW CONFIG (TOML / JSON) */}
      {activeTab === "raw" && (
        <div className="mcp-raw-container">
          <div className="mcp-raw-toolbar">
            <span className="mcp-raw-hint">
              {isRu ? "Редактор конфигурации серверов в формате TOML/JSON" : "Raw MCP server configuration editor"}
            </span>
            <button type="button" className="mcp-btn mcp-btn--primary" onClick={handleSaveRaw}>
              {isRu ? "Сохранить конфигурацию" : "Save Configuration"}
            </button>
          </div>
          <textarea
            className="mcp-raw-textarea"
            value={rawToml}
            onChange={(e) => setRawToml(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      {/* ADD / EDIT SERVER MODAL */}
      {isModalOpen && (
        <div className="mcp-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="mcp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mcp-modal__header">
              <h3>
                {editingServer
                  ? (isRu ? "Настройка MCP-сервера" : "Edit MCP Server")
                  : (isRu ? "Подключение нового MCP-сервера" : "Add MCP Server")}
              </h3>
              <button type="button" className="mcp-modal__close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="mcp-modal__body">
              {formError && (
                <div className="mcp-modal__error">
                  <span>{formError}</span>
                </div>
              )}

              <div className="mcp-form-group">
                <label>{isRu ? "Имя сервера (ID)" : "Server Name (ID)"}</label>
                <input
                  type="text"
                  className="mcp-form-input"
                  placeholder="filesystem"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="mcp-form-row">
                <div className="mcp-form-group flex-1">
                  <label>{isRu ? "Команда запуска" : "Executable / Command"}</label>
                  <input
                    type="text"
                    className="mcp-form-input"
                    placeholder="npx / uvx / node / python"
                    value={formCommand}
                    onChange={(e) => setFormCommand(e.target.value)}
                  />
                </div>
              </div>

              <div className="mcp-form-group">
                <label>{isRu ? "Аргументы (через пробел)" : "Arguments"}</label>
                <input
                  type="text"
                  className="mcp-form-input"
                  placeholder="-y @modelcontextprotocol/server-filesystem C:\\path"
                  value={formArgs}
                  onChange={(e) => setFormArgs(e.target.value)}
                />
              </div>

              {/* Environment Variables Section */}
              <div className="mcp-form-group">
                <div className="mcp-env-header">
                  <label>{isRu ? "Переменные окружения (ENV)" : "Environment Variables"}</label>
                  <button
                    type="button"
                    className="mcp-btn-add-env"
                    onClick={() => setFormEnv([...formEnv, { key: "", value: "" }])}
                  >
                    + {isRu ? "Добавить переменную" : "Add variable"}
                  </button>
                </div>
                {formEnv.map((item, idx) => (
                  <div key={idx} className="mcp-env-row">
                    <input
                      type="text"
                      className="mcp-form-input"
                      placeholder="KEY (e.g. GITHUB_TOKEN)"
                      value={item.key}
                      onChange={(e) => {
                        const updated = [...formEnv];
                        updated[idx].key = e.target.value;
                        setFormEnv(updated);
                      }}
                    />
                    <input
                      type="password"
                      className="mcp-form-input"
                      placeholder="VALUE"
                      value={item.value}
                      onChange={(e) => {
                        const updated = [...formEnv];
                        updated[idx].value = e.target.value;
                        setFormEnv(updated);
                      }}
                    />
                    <button
                      type="button"
                      className="mcp-env-remove"
                      onClick={() => setFormEnv(formEnv.filter((_, i) => i !== idx))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mcp-form-toggle-row">
                <span>{isRu ? "Включить сервер сразу после сохранения" : "Enable server immediately"}</span>
                <Toggle checked={formEnabled} onValueChange={setFormEnabled} />
              </div>
            </div>

            <div className="mcp-modal__footer">
              <button type="button" className="mcp-btn mcp-btn--secondary" onClick={() => setIsModalOpen(false)}>
                {isRu ? "Отмена" : "Cancel"}
              </button>
              <button type="button" className="mcp-btn mcp-btn--primary" onClick={handleSaveForm}>
                {isRu ? "Сохранить и применить" : "Save & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
