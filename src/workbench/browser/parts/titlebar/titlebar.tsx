import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import "./titlebar.css";
import { ContextMenu, type MenuItem } from "@/base/browser/ui/contextMenu/contextMenu";
import {
  CloseIcon,
  FolderTreeIcon,
  GitBranchIcon,
  MaximizeIcon,
  MinimizeIcon,
  NewSessionIcon,
  SearchIcon,
  SearchInCodeIcon,
  SidebarToggleIcon,
  TerminalIcon,
} from "@/base/browser/ui/icons/iconRegistry";
import { Tooltip } from "@/base/browser/ui/tooltip/tooltip";
import { useI18n } from "@/platform/localization/localizationService";
import { windowApi } from "@/platform/native/tauri/windowService";

interface TitlebarProps {
  chatSideOpen?: boolean;
  onToggleChatSide?: () => void;
  onNewChat?: () => void;
  terminalOpen?: boolean;
  onToggleTerminal?: () => void;
  searchInCodeOpen?: boolean;
  onToggleSearchInCode?: () => void;
  fileTreeOpen?: boolean;
  onToggleFileTree?: () => void;
  folder?: string | null;
  projectName?: string | null;
  onSearchOpen?: () => void;
  onOpenSettings?: (tab?: string) => void;
  gitPanelOpen?: boolean;
  onToggleGitPanel?: () => void;
}

const STORAGE_KEY = "titlebar:hidden";

type BtnId =
  | "sidebar"
  | "new-session"
  | "terminal"
  | "search-in-code"
  | "file-tree"
  | "git-panel"
  | "mcp";

function loadHidden(): Set<BtnId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set<BtnId>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<BtnId>();
  }
}

function folderLabel(folder: string | null | undefined): string {
  if (!folder) return "Workspace";
  const parts = folder.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "Workspace";
}

const LEFT_BTNS: BtnId[] = ["sidebar", "new-session", "file-tree", "search-in-code", "git-panel", "terminal"];
const RIGHT_BTNS: BtnId[] = ["mcp"];
const ALL_BTNS: BtnId[] = [...LEFT_BTNS, ...RIGHT_BTNS];

export function Titlebar({
  chatSideOpen = false,
  onToggleChatSide = () => {},
  onNewChat = () => {},
  terminalOpen = false,
  onToggleTerminal = () => {},
  searchInCodeOpen = false,
  onToggleSearchInCode = () => {},
  fileTreeOpen = false,
  onToggleFileTree = () => {},
  gitPanelOpen = false,
  onToggleGitPanel = () => {},
  folder,
  projectName,
  onSearchOpen = () => {},
  onOpenSettings = () => {},
}: TitlebarProps): React.ReactElement {
  const { t } = useI18n();
  const [hidden, setHidden] = useState<Set<BtnId>>(loadHidden);
  const [hiding, setHiding] = useState<Set<BtnId>>(new Set());
  const [showing, setShowing] = useState<Set<BtnId>>(new Set());
  const [ctx, setCtx] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

  const [projectTitle, setProjectTitle] = useState<string>(() => {
    if (projectName && projectName.trim()) return projectName.trim();
    return folderLabel(folder);
  });

  useEffect(() => {
    if (projectName && projectName.trim()) {
      setProjectTitle(projectName.trim());
    } else {
      setProjectTitle(folderLabel(folder));
    }
  }, [projectName, folder]);

  useEffect(() => {
    const handleRenamed = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string; name?: string }>;
      if (customEvent.detail?.name) {
        setProjectTitle(customEvent.detail.name.trim());
      }
    };
    window.addEventListener("premire:project-renamed", handleRenamed);
    window.addEventListener("vibe:workspace:renamed", handleRenamed);
    return () => {
      window.removeEventListener("premire:project-renamed", handleRenamed);
      window.removeEventListener("vibe:workspace:renamed", handleRenamed);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined" && projectTitle) {
      document.title = `${projectTitle} — Premire`;
    }
  }, [projectTitle]);

  const handleWindowDrag = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (!target || typeof target.closest !== "function") return;
    if (
      target.closest(
        "button, input, select, textarea, a, [role=button], .titlebar__action-btn, .titlebar__brand-btn, .titlebar__command-bar, .titlebar__badge-btn, .titlebar__btn, .titlebar__center",
      )
    ) {
      return;
    }
    void windowApi.startDragging().catch(() => {});
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
  }, [hidden]);

  const hide = useCallback((id: BtnId) => {
    setHiding((p) => new Set(p).add(id));
    setTimeout(() => {
      setHiding((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
      setHidden((p) => new Set(p).add(id));
    }, 200);
  }, []);

  const unhide = useCallback((id: BtnId) => {
    setHidden((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
    setShowing((p) => new Set(p).add(id));
    setTimeout(() => {
      setShowing((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }, 200);
  }, []);

  function btnLabel(id: BtnId): string {
    switch (id) {
      case "sidebar":
        return chatSideOpen ? t("hideSessions") : t("showSessions");
      case "new-session":
        return t("newSessionTitle");
      case "terminal":
        return t("toggleTerminal");
      case "search-in-code":
        return t("searchInCode");
      case "git-panel":
        return gitPanelOpen ? "Hide Source Control" : "Show Source Control";
      case "file-tree":
        return fileTreeOpen ? t("hideFileTree") : t("showFileTree");
      case "mcp":
        return "MCP Servers";
    }
  }

  function isVisible(id: BtnId): boolean {
    if (hiding.has(id)) return true;
    if (hidden.has(id) && !showing.has(id)) return false;
    return true;
  }

  function btnClasses(id: BtnId, extra = ""): string {
    let cls = "titlebar__action-btn";
    if (extra) cls += ` ${extra}`;
    if (hiding.has(id)) cls += " titlebar__action-btn--hiding";
    if (showing.has(id)) cls += " titlebar__action-btn--showing";
    return cls;
  }

  function onBtnCtx(e: React.MouseEvent, id: BtnId): void {
    e.preventDefault();
    e.stopPropagation();
    setCtx({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: `${t("hideButton")} «${btnLabel(id)}»`,
          onClick: () => hide(id),
        },
      ],
    });
  }

  function onSectionCtx(e: React.MouseEvent, ids: BtnId[]): void {
    e.preventDefault();
    const hiddenHere = ids.filter((id) => hidden.has(id) && !showing.has(id));
    if (hiddenHere.length === 0) return;
    setCtx({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: t("restoreButtons"), disabled: true },
        ...hiddenHere.map((id) => ({
          label: `${t("showButton")} «${btnLabel(id)}»`,
          onClick: () => unhide(id),
        })),
      ],
    });
  }

  const handleMenuClick = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCtx({
      x: Math.max(8, rect.left),
      y: rect.bottom + 6,
      items: [
        { label: t("newSessionTitle") || "New Chat", shortcut: "Ctrl+N", onClick: () => onNewChat?.() },
        { label: t("toggleSessions") || "Toggle Sidebar", shortcut: "Ctrl+B", onClick: () => onToggleChatSide?.() },
        { type: "separator" },
        { label: t("filesTitle") || "Explorer", shortcut: "Ctrl+Shift+E", onClick: () => onToggleFileTree?.() },
        { label: t("searchTitle") || "Search in Code", shortcut: "Ctrl+Shift+F", onClick: () => onToggleSearchInCode?.() },
        { label: t("gitTitle") || "Source Control", shortcut: "Ctrl+Shift+G", onClick: () => onToggleGitPanel?.() },
        { label: t("terminalTitle") || "Terminal", shortcut: "Ctrl+`", onClick: () => onToggleTerminal?.() },
        { type: "separator" },
        { label: "MCP Servers Hub", shortcut: "MCP", onClick: () => onOpenSettings?.("mcp") },
        { label: t("settings") || "Settings", shortcut: "Ctrl+,", onClick: () => onOpenSettings?.("general") },
        { label: t("hotkeys") || "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S", onClick: () => onOpenSettings?.("keybindings") },
      ],
    });
  };

  return (
    <div className="titlebar" onMouseDown={handleWindowDrag} onContextMenu={(e) => onSectionCtx(e, ALL_BTNS)}>
      <div className="titlebar__left" onContextMenu={(e) => onSectionCtx(e, LEFT_BTNS)}>
        {/* Premire Integrated Brand & Menu Button */}
        <button
          type="button"
          className="titlebar__brand-btn"
          onClick={handleMenuClick}
          onContextMenu={handleMenuClick}
          aria-label={t("menu")}
          title="Premire Menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="titlebar__brand-glyph">
            <rect x="3.5" y="3" width="6.5" height="18" rx="3.25" fill="#f8fafc" />
            <rect x="14" y="3" width="6.5" height="10.5" rx="3.25" fill="#94a3b8" />
          </svg>
          <span className="titlebar__brand-text">Premire</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="titlebar__brand-caret">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="titlebar__nav-divider" />

        {/* Workspace Navigation Dock */}
        <div className="titlebar__dock">
          {isVisible("sidebar") && (
            <Tooltip text={chatSideOpen ? t("hideSessions") : t("showSessions")} side="bottom">
              <button
                type="button"
                className={btnClasses("sidebar", chatSideOpen ? "titlebar__action-btn--active" : "")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleChatSide?.();
                }}
                onContextMenu={(e) => onBtnCtx(e, "sidebar")}
                aria-label={t("toggleSessions")}
              >
                <SidebarToggleIcon />
              </button>
            </Tooltip>
          )}

          {isVisible("new-session") && (
            <Tooltip text={`${t("newSessionTitle")} (Ctrl+N)`} side="bottom">
              <button
                type="button"
                className={btnClasses("new-session")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNewChat?.();
                }}
                onContextMenu={(e) => onBtnCtx(e, "new-session")}
                aria-label={t("newSessionTitle")}
              >
                <NewSessionIcon />
              </button>
            </Tooltip>
          )}

          <div className="titlebar__dock-separator" />

          {/* Core Panel Navigation Buttons */}
          {isVisible("file-tree") && (
            <Tooltip text={`${t("filesTitle") || "Explorer"} (Ctrl+Shift+E)`} side="bottom">
              <button
                type="button"
                className={btnClasses("file-tree", fileTreeOpen ? "titlebar__action-btn--active" : "")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFileTree?.();
                }}
                onContextMenu={(e) => onBtnCtx(e, "file-tree")}
                aria-label={t("filesTitle") || "Explorer"}
              >
                <FolderTreeIcon />
              </button>
            </Tooltip>
          )}

          {isVisible("search-in-code") && (
            <Tooltip text={`${t("searchTitle") || "Search in Code"} (Ctrl+Shift+F)`} side="bottom">
              <button
                type="button"
                className={btnClasses("search-in-code", searchInCodeOpen ? "titlebar__action-btn--active" : "")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSearchInCode?.();
                }}
                onContextMenu={(e) => onBtnCtx(e, "search-in-code")}
                aria-label={t("searchTitle") || "Search in Code"}
              >
                <SearchInCodeIcon />
              </button>
            </Tooltip>
          )}

          {isVisible("git-panel") && (
            <Tooltip text={`${t("gitTitle") || "Source Control"} (Ctrl+Shift+G)`} side="bottom">
              <button
                type="button"
                className={btnClasses("git-panel", gitPanelOpen ? "titlebar__action-btn--active" : "")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleGitPanel?.();
                }}
                onContextMenu={(e) => onBtnCtx(e, "git-panel")}
                aria-label={t("gitTitle") || "Source Control"}
              >
                <GitBranchIcon />
              </button>
            </Tooltip>
          )}

          {isVisible("terminal") && (
            <Tooltip text={`${t("terminalTitle") || "Terminal"} (Ctrl+\`)`} side="bottom">
              <button
                type="button"
                className={btnClasses("terminal", terminalOpen ? "titlebar__action-btn--active" : "")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleTerminal?.();
                }}
                onContextMenu={(e) => onBtnCtx(e, "terminal")}
                aria-label={t("terminalTitle") || "Terminal"}
              >
                <TerminalIcon />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="titlebar__center">
        <button
          type="button"
          className="titlebar__command-bar"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSearchOpen?.();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          title={`${t("searchIn", { folder: projectTitle })} (Ctrl+P)`}
        >
          <div className="titlebar__command-folder" title={projectTitle}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="titlebar__folder-name">{projectTitle}</span>
          </div>
          <span className="titlebar__command-divider" />
          <div className="titlebar__command-search">
            <SearchIcon />
            <span className="titlebar__command-placeholder">
              {t("searchIn", { folder: projectTitle })}
            </span>
          </div>
          <kbd className="titlebar__command-shortcut">Ctrl+P</kbd>
        </button>
      </div>

      <div className="titlebar__right" onContextMenu={(e) => onSectionCtx(e, RIGHT_BTNS)}>
        {/* Quick Access: MCP Hub */}
        {isVisible("mcp") && (
          <Tooltip text="Model Context Protocol (MCP) Hub" side="bottom">
            <button
              type="button"
              className="titlebar__badge-btn"
              onClick={() => onOpenSettings?.("mcp")}
              onContextMenu={(e) => onBtnCtx(e, "mcp")}
              aria-label="MCP Servers"
            >
              <span className="titlebar__badge-dot" />
              <span>MCP</span>
            </button>
          </Tooltip>
        )}

        <div className="titlebar__nav-divider" />

        <div className="titlebar__controls">
          <button
            type="button"
            className="titlebar__btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void windowApi.minimize();
            }}
            aria-label={t("minimizeLabel")}
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            className="titlebar__btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void windowApi.maximize();
            }}
            aria-label={t("maximizeLabel")}
          >
            <MaximizeIcon />
          </button>
          <button
            type="button"
            className="titlebar__btn titlebar__btn--close"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void windowApi.close();
            }}
            aria-label={t("closeLabel")}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {ctx &&
        typeof document !== "undefined" &&
        createPortal(
          <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} />,
          document.body,
        )}
    </div>
  );
}
