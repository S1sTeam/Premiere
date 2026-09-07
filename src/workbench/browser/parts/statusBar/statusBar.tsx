import type React from "react";
import { useEffect, useState } from "react";
import { GitBranchIcon } from "@/base/browser/ui/icons/gitIcons";
import { Tooltip } from "@/base/browser/ui/tooltip/tooltip";
import { gitScmService } from "@/workbench/services/scm/tauri/gitScmService";
import type { VibeConfig } from "@/workbench/services/aiProviders/common/aiProvider";
import "./statusBar.css";

interface StatusBarProps {
  folder: string | null;
  config?: VibeConfig;
  activeFile?: string | null;
  dirtyFilesCount?: number;
  onToggleGitPanel?: () => void;
  onToggleTerminal?: () => void;
  onOpenSettings?: (tab?: string) => void;
}

function getLanguageName(filePath: string | null | undefined): string {
  if (!filePath) return "Plain Text";
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
      return "TypeScript";
    case "tsx":
      return "TypeScript React";
    case "js":
      return "JavaScript";
    case "jsx":
      return "JavaScript React";
    case "rs":
      return "Rust";
    case "py":
      return "Python";
    case "json":
      return "JSON";
    case "css":
      return "CSS";
    case "html":
      return "HTML";
    case "md":
      return "Markdown";
    case "svg":
      return "SVG";
    case "toml":
      return "TOML";
    case "yaml":
    case "yml":
      return "YAML";
    case "sql":
      return "SQL";
    case "go":
      return "Go";
    case "sh":
    case "bash":
      return "Shell";
    default:
      return ext ? ext.toUpperCase() : "Plain Text";
  }
}

function CustomCyberFoldIcon({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      className={`premire-cyber-icon${collapsed ? " premire-cyber-icon--collapsed" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M3 13.5A2.5 2.5 0 0 0 5.5 16h9a2.5 2.5 0 0 0 2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 8.5L10 11.5L13 8.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="4.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CustomCyberExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      className="premire-cyber-icon premire-cyber-icon--expand"
      aria-hidden="true"
    >
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4h9A2.5 2.5 0 0 1 17 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 11.5L10 8.5L13 11.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="15.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function StatusBar({
  folder,
  config,
  activeFile,
  dirtyFilesCount = 0,
  onToggleGitPanel,
  onToggleTerminal,
  onOpenSettings,
}: StatusBarProps): React.ReactElement {
  const [branch, setBranch] = useState<string>("main");
  const [cursor, setCursor] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [currentFile, setCurrentFile] = useState<string | null>(activeFile ?? null);
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("premire_statusbar_hidden") === "true";
    } catch {
      return false;
    }
  });

  const toggleStatusBar = () => {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("premire_statusbar_hidden", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        toggleStatusBar();
      }
    };
    const handleToggle = () => toggleStatusBar();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("premire:toggle-status-bar", handleToggle);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("premire:toggle-status-bar", handleToggle);
    };
  }, []);

  useEffect(() => {
    if (activeFile) setCurrentFile(activeFile);
  }, [activeFile]);

  useEffect(() => {
    if (!folder) return;
    let cancelled = false;
    gitScmService
      .currentBranch(folder)
      .then((res) => {
        if (!cancelled && res.ok && res.data) {
          setBranch(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setBranch("main");
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  useEffect(() => {
    const handleCursor = (e: Event) => {
      const detail = (e as CustomEvent<{ line: number; col: number; path?: string }>).detail;
      if (detail) {
        if (detail.line !== undefined && detail.col !== undefined) {
          setCursor({ line: detail.line, col: detail.col });
        }
        if (detail.path) {
          setCurrentFile(detail.path);
        }
      }
    };
    window.addEventListener("premire:editor-cursor", handleCursor);
    return () => window.removeEventListener("premire:editor-cursor", handleCursor);
  }, []);

  const language = getLanguageName(currentFile);
  const modelName = config?.model || "sonnet-3.7";

  return (
    <>
      <footer
        className={`premire-status-bar${hidden ? " premire-status-bar--hidden" : ""}`}
        role="contentinfo"
        aria-label="Status Bar"
        style={hidden ? { display: "none" } : undefined}
      >
      <div className="premire-status-bar__section">
        {/* Git Branch & Status */}
        <Tooltip text={`Git Branch: ${branch}${dirtyFilesCount > 0 ? ` (${dirtyFilesCount} modified)` : ""}`}>
          <button
            type="button"
            className="premire-status-bar__item"
            onClick={onToggleGitPanel}
            aria-label={`Branch: ${branch}`}
          >
            <span className="premire-status-bar__icon">
              <GitBranchIcon size={13} />
            </span>
            <span>{branch}</span>
            {dirtyFilesCount > 0 && <span className="premire-status-bar__badge">*{dirtyFilesCount}</span>}
          </button>
        </Tooltip>

        <div className="premire-status-bar__divider" />

        {/* Problems Indicator */}
        <Tooltip text="No errors or warnings">
          <button
            type="button"
            className="premire-status-bar__item premire-status-bar__problems"
            onClick={onToggleTerminal}
            aria-label="Problems: 0 errors, 0 warnings"
          >
            <span className="premire-status-bar__problems-err">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm2.8 9.4l-.8.8L8 9.2l-2 2-.8-.8 2-2-2-2 .8-.8 2 2 2-2 .8.8-2 2 2 2.2z" />
              </svg>
              <span>0</span>
            </span>
            <span className="premire-status-bar__problems-warn">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.5 1.5a.75.75 0 0 0-1 0l-6.5 11A.75.75 0 0 0 1.65 14h12.7a.75.75 0 0 0 .65-1.12l-6.5-11zM8 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7a.88.88 0 1 1 0-1.75.88.88 0 0 1 0 1.75z" />
              </svg>
              <span>0</span>
            </span>
          </button>
        </Tooltip>
      </div>

      <div className="premire-status-bar__section">
        {/* Cursor Position */}
        <Tooltip text="Go to Line/Column">
          <button
            type="button"
            className="premire-status-bar__item"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("premire:editor-goto-line"));
            }}
          >
            <span>
              Ln {cursor.line}, Col {cursor.col}
            </span>
          </button>
        </Tooltip>

        {/* Indentation */}
        <Tooltip text="Indentation: Spaces: 2">
          <span className="premire-status-bar__item premire-status-bar__item--static">
            <span>Spaces: 2</span>
          </span>
        </Tooltip>

        {/* Encoding */}
        <Tooltip text="Encoding: UTF-8">
          <span className="premire-status-bar__item premire-status-bar__item--static">
            <span>UTF-8</span>
          </span>
        </Tooltip>

        {/* Line Ending */}
        <Tooltip text="Line Sequence: LF">
          <span className="premire-status-bar__item premire-status-bar__item--static">
            <span>LF</span>
          </span>
        </Tooltip>

        {/* Language Mode */}
        <Tooltip text={`Language: ${language}`}>
          <button type="button" className="premire-status-bar__item">
            <span>{language}</span>
          </button>
        </Tooltip>

        <div className="premire-status-bar__divider" />

        {/* AI Model Badge (Icon only, model name text removed) */}
        <Tooltip text={`Premire AI (${modelName}) • Нажмите для настроек провайдеров`}>
          <button
            type="button"
            className="premire-status-bar__item premire-status-bar__pill premire-status-bar__pill--icon-only"
            onClick={() => onOpenSettings?.("providers")}
            aria-label={`AI: ${modelName}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4L12 2z" />
            </svg>
          </button>
        </Tooltip>

        <div className="premire-status-bar__divider" />

        {/* Custom Hide Button with Custom CyberFold Icon */}
        <Tooltip text="Скрыть строку состояния (Ctrl+Shift+U)">
          <button
            type="button"
            className="premire-status-bar__item premire-status-bar__hide-btn"
            onClick={toggleStatusBar}
            aria-label="Скрыть строку состояния"
          >
            <CustomCyberFoldIcon />
          </button>
        </Tooltip>
      </div>
    </footer>

    {/* Floating Cyber Capsule when status bar is hidden */}
    {hidden && (
      <Tooltip text={`Строка состояния скрыта (Ctrl+Shift+U) • Нажмите, чтобы развернуть`}>
        <button
          type="button"
          className="premire-status-bar__floating-capsule"
          onClick={toggleStatusBar}
          aria-label="Развернуть строку состояния"
        >
          <CustomCyberExpandIcon />
          <span className="premire-status-bar__floating-dot" />
        </button>
      </Tooltip>
    )}
    </>
  );
}
