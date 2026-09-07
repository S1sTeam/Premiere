export interface CommandItem {
  id: string;
  labelKey: string;
  defaultLabel?: string;
  keywords: string[];
  shortcut?: string;
}

export interface QuickAccessDialogProps {
  folder: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onSwitchChat: (direction: "prev" | "next") => void;
  onToggleTerminal: () => void;
  onOpenFile?: (path: string) => void;
  onRevealFolder?: (path: string) => void;
  onCommand?: (id: string) => void;
}

export const commands: CommandItem[] = [
  {
    id: "search-in-code",
    labelKey: "searchInCode",
    defaultLabel: "Search in Code",
    shortcut: "Ctrl+Shift+F",
    keywords: [
      "search",
      "search in code",
      "search in files",
      "find",
      "find in files",
      "code search",
      "поиск",
      "поиск по коду",
      "найти в коде",
      "найти в файлах",
      "искать",
    ],
  },
  {
    id: "new-session",
    labelKey: "newSession",
    defaultLabel: "New Chat Session",
    shortcut: "Ctrl+N",
    keywords: ["new session", "new chat", "новая сессия", "новый чат", "создать чат"],
  },
  {
    id: "toggle-file-tree",
    labelKey: "toggleFileTree",
    defaultLabel: "Toggle File Tree (Explorer)",
    shortcut: "Ctrl+Shift+E",
    keywords: ["toggle file tree", "file tree", "explorer", "files", "дерево файлов", "проводник", "файлы", "переключить дерево файлов"],
  },
  {
    id: "toggle-git-panel",
    labelKey: "sourceControl",
    defaultLabel: "Source Control (Git)",
    shortcut: "Ctrl+Shift+G",
    keywords: ["git", "source control", "git panel", "vcs", "ветки", "коммиты", "гит", "контроль версий"],
  },
  {
    id: "toggle-terminal",
    labelKey: "toggleTerminal",
    defaultLabel: "Toggle Terminal",
    shortcut: "Ctrl+`",
    keywords: ["toggle terminal", "terminal", "console", "терминал", "консоль", "переключить терминал"],
  },
  {
    id: "open-mcp",
    labelKey: "mcpServers",
    defaultLabel: "Model Context Protocol (MCP) Hub",
    keywords: ["mcp", "mcp hub", "mcp servers", "tools", "серверы mcp", "протокол контекста модели", "инструменты"],
  },
  {
    id: "open-settings",
    labelKey: "openSettingsHotkey",
    defaultLabel: "Open Settings",
    shortcut: "Ctrl+,",
    keywords: ["open settings", "settings", "preferences", "настройки", "параметры", "открыть настройки"],
  },
  {
    id: "open-hotkeys",
    labelKey: "hotkeys",
    defaultLabel: "Keyboard Shortcuts",
    shortcut: "Ctrl+K Ctrl+S",
    keywords: ["hotkeys", "shortcuts", "keybindings", "горячие клавиши", "клавиатура", "комбинации клавиш"],
  },
  {
    id: "open-providers",
    labelKey: "providers",
    defaultLabel: "AI Models & Providers",
    keywords: ["providers", "models", "ai", "провайдеры", "модели", "ии", "api key", "ключ"],
  },
  {
    id: "toggle-chat-side",
    labelKey: "toggleSessions",
    defaultLabel: "Toggle Sessions Sidebar",
    shortcut: "Ctrl+B",
    keywords: [
      "toggle sidebar",
      "toggle sessions",
      "toggle chat side",
      "sidebar",
      "sessions",
      "сайдбар",
      "боковая панель",
      "сессии",
      "переключить сайдбар",
      "переключить сессии",
    ],
  },
  {
    id: "prev-session",
    labelKey: "prevSession",
    defaultLabel: "Previous Session",
    shortcut: "Ctrl+Shift+Tab",
    keywords: ["previous session", "prev session", "предыдущая сессия"],
  },
  {
    id: "next-session",
    labelKey: "nextSession",
    defaultLabel: "Next Session",
    shortcut: "Ctrl+Tab",
    keywords: ["next session", "следующая сессия"],
  },
  {
    id: "new-terminal",
    labelKey: "newTerminal",
    defaultLabel: "New Terminal",
    shortcut: "Ctrl+Shift+T",
    keywords: ["new terminal", "новый терминал"],
  },
  {
    id: "close-terminal",
    labelKey: "closeTerminal",
    defaultLabel: "Close Terminal",
    shortcut: "Ctrl+Shift+X",
    keywords: ["close terminal", "hide terminal", "закрыть терминал", "скрыть терминал"],
  },
  {
    id: "close-project",
    labelKey: "closeProjectHotkey",
    defaultLabel: "Close Project",
    shortcut: "Ctrl+Shift+W",
    keywords: ["close project", "закрыть проект"],
  },
  {
    id: "new-project",
    labelKey: "newProjectHotkey",
    defaultLabel: "Open Folder / New Project",
    shortcut: "Ctrl+Shift+N",
    keywords: ["new project", "open project", "новый проект", "открыть проект", "открыть папку"],
  },
  {
    id: "close-file",
    labelKey: "closeFileHotkey",
    defaultLabel: "Close Active File",
    shortcut: "Ctrl+W",
    keywords: ["close file", "close tab", "закрыть файл", "закрыть вкладку"],
  },
  {
    id: "clear-chat",
    labelKey: "clearChatHotkey",
    defaultLabel: "Clear Chat History",
    shortcut: "Ctrl+L",
    keywords: ["clear chat", "clear session", "очистить чат", "очистить сессию"],
  },
];

export function filterCommands(query: string, t?: (key: any) => string): CommandItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = commands
    .map((cmd) => {
      let best = 0;
      for (const kw of cmd.keywords) {
        const k = kw.toLowerCase();
        if (k === q) best = Math.max(best, 100);
        else if (k.startsWith(q)) best = Math.max(best, 60);
        else if (k.includes(q)) best = Math.max(best, 20);
      }
      if (cmd.defaultLabel) {
        const dl = cmd.defaultLabel.toLowerCase();
        if (dl === q) best = Math.max(best, 100);
        else if (dl.startsWith(q)) best = Math.max(best, 50);
        else if (dl.includes(q)) best = Math.max(best, 15);
      }
      if (t) {
        const label = (t(cmd.labelKey as any) || "").toLowerCase();
        if (label && label !== cmd.labelKey.toLowerCase()) {
          if (label === q) best = Math.max(best, 100);
          else if (label.startsWith(q)) best = Math.max(best, 60);
          else if (label.includes(q)) best = Math.max(best, 25);
        }
      }
      return { cmd, score: best };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.cmd);

  return scored;
}
