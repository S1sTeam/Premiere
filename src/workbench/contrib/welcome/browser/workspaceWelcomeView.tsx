import { Button } from "@zazaru/ui";
import type React from "react";
import {
  FolderOpenStrokeIcon,
  GitBranchIcon,
  NewSessionIcon,
  SearchIcon,
  SearchInCodeIcon,
  SettingsIcon,
} from "@/base/browser/ui/icons/iconRegistry";
import { useI18n } from "@/platform/localization/localizationService";
import { SidebarView } from "@/workbench/browser/parts/sidebar/sidebarView";
import "./workspaceWelcomeView.css";
import type { WorkspaceWelcomeViewProps } from "../common/welcome";

export function WorkspaceWelcomeView({
  projects,
  activeProject,
  handlePickProject,
  handleAddProject,
  handleRemoveProject,
  onProjectChange,
  setSettingsOpen,
  onOpenSettingsTab,
  onOpenSearch,
  onNewChat,
  removingIds,
}: WorkspaceWelcomeViewProps): React.ReactElement {
  const { t, lang } = useI18n();
  const isRu = lang === "Russian";

  const features = [
    {
      id: "effort",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
          <path d="M5 12h2" />
          <path d="M17 12h2" />
          <path d="M12 5v2" />
        </svg>
      ),
      badge: "Off • 1K • 2K • 8K • 16K • 32K+",
      title: isRu ? "Система рассуждений Effort" : "Reasoning Effort System",
      desc: isRu
        ? "Точный контроль глубины цепочки рассуждений: от мгновенного режима Off и 1K до глубокого анализа Max (32K+) и кастомного бюджета токенов."
        : "Fine-tune model thinking depth: switch between Off, Minimal (1K), Low (2K), Medium (8K), High (16K), Max (32K+), or custom token limits.",
    },
    {
      id: "mcp",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="8" rx="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
          <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
        </svg>
      ),
      badge: "Extensible Hub",
      title: isRu ? "Экосистема серверов MCP" : "Model Context Protocol (MCP)",
      desc: isRu
        ? "Подключайте базы данных, CLI-утилиты, браузерную автоматизацию и внешние сервисы прямо в рантайм ИИ по открытому протоколу MCP."
        : "Connect local databases, developer CLI tools, browser scrapers, and external APIs directly into agent workflows using native MCP servers.",
    },
    {
      id: "agents",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      badge: "Parallel Subagents",
      title: isRu ? "Мультиагентный рантайм" : "Autonomous Multi-Agent Runtime",
      desc: isRu
        ? "Параллельные субагенты с изолированными воркспейсами, пошаговое планирование задач и полный прозрачный аудит действий."
        : "Orchestrate background tasks, spawn isolated subagents in parallel workspaces, and inspect full reasoning trajectory steps.",
    },
    {
      id: "search",
      icon: <SearchInCodeIcon />,
      badge: "ripgrep • Ctrl+Shift+F",
      title: isRu ? "Мгновенный поиск по коду" : "Sub-Millisecond Code Search",
      desc: isRu
        ? "Молниеносный полнотекстовый поиск ripgrep по всему проекту (Ctrl+Shift+F), быстрый переход к файлам (Ctrl+P) и фильтрация по regex."
        : "Ripgrep-powered search across entire repositories with regex filtering, case sensitivity, whole-word matching, and instant file jumping.",
    },
    {
      id: "git",
      icon: <GitBranchIcon />,
      badge: "Git • Multi-Terminal",
      title: isRu ? "Встроенный Git и Терминал" : "Native Git & Integrated Terminal",
      desc: isRu
        ? "Управление ветками, визуальный просмотр диффов, фиксация коммитов (Ctrl+Shift+G) и вкладки встроенных терминалов (Ctrl+`)."
        : "Visual branch status, interactive diff review, staging commits (Ctrl+Shift+G), and multi-tab embedded shell terminals (Ctrl+`).",
    },
    {
      id: "privacy",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      badge: "Zero Telemetry",
      title: isRu ? "Приватность и свобода моделей" : "Privacy-First & Model Freedom",
      desc: isRu
        ? "Прямое подключение к Claude 3.7 / 3.5, DeepSeek R1, GPT-4o, Gemini или локальным моделям через Ollama без сбора телеметрии."
        : "Direct BYOK connections to Claude 3.7, DeepSeek R1, GPT-4o, Gemini, or local models via Ollama with zero tracking of your source code.",
    },
  ];

  const shortcuts = [
    { label: isRu ? "Быстрый поиск / Палитра" : "Quick Access / Palette", key: "Ctrl+P" },
    { label: isRu ? "Поиск по коду" : "Search in Code", key: "Ctrl+Shift+F" },
    { label: isRu ? "Проводник файлов" : "File Explorer", key: "Ctrl+Shift+E" },
    { label: isRu ? "Контроль версий (Git)" : "Source Control", key: "Ctrl+Shift+G" },
    { label: isRu ? "Встроенный терминал" : "Integrated Terminal", key: "Ctrl+`" },
    { label: isRu ? "Боковая панель" : "Toggle Sidebar", key: "Ctrl+B" },
    { label: isRu ? "Настройки" : "Settings", key: "Ctrl+," },
  ];

  return (
    <div className="welcome">
      <div className="welcome__main">
        <SidebarView
          open={true}
          width={240}
          onResize={() => {}}
          projects={projects}
          activeProjectId={activeProject}
          activeChatId={null}
          onPickProject={(id) => handlePickProject(id, onProjectChange)}
          onAddProject={() => handleAddProject(onProjectChange)}
          onRemoveProject={(id) => handleRemoveProject(id, onProjectChange)}
          onPickChat={(projectId) => {
            if (projectId) {
              handlePickProject(projectId, onProjectChange);
            }
          }}
          onNewChat={() => onNewChat?.() || handleAddProject(onProjectChange)}
          onDeleteChat={() => {}}
          onOpenSettings={() => setSettingsOpen(true)}
          removingIds={removingIds}
        />

        <div className="welcome__content">
          <div className="welcome__scroll-container">
            {/* Hero Section */}
            <section className="welcome__hero-section">
              <div className="welcome__badge-container">
                <div className="welcome__brand-badge">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="welcome__brand-svg">
                    <rect x="3.5" y="3" width="6.5" height="18" rx="3.25" fill="#f8fafc" />
                    <rect x="14" y="3" width="6.5" height="10.5" rx="3.25" fill="#94a3b8" />
                  </svg>
                  <span className="welcome__brand-name">Premire</span>
                </div>
                <div className="welcome__version-pill">
                  <span className="welcome__version-dot" />
                  <span>v1.0 Ready</span>
                </div>
              </div>

              <h1 className="welcome__hero-title">
                {isRu ? "Автономная AI-среда разработки нового поколения" : "Next-Generation Autonomous AI Code Studio"}
              </h1>
              <p className="welcome__hero-subtitle">
                {isRu
                  ? "Максимальный контроль над рассуждениями модели, глубокая интеграция серверов MCP, сверхбыстрый поиск ripgrep и полная свобода выбора ИИ."
                  : "Granular reasoning effort budgets, native Model Context Protocol (MCP) tooling, blazing-fast ripgrep search, and total provider freedom."}
              </p>

              {/* Primary Actions Row */}
              <div className="welcome__actions-row">
                <Button
                  className="welcome__primary-btn"
                  variant="primary"
                  icon={<FolderOpenStrokeIcon size={16} strokeWidth={1.8} aria-hidden="true" />}
                  onClick={() => handleAddProject(onProjectChange)}
                >
                  {t("openFolder") || (isRu ? "Открыть папку" : "Open Folder")}
                </Button>

                <button
                  type="button"
                  className="welcome__secondary-btn"
                  onClick={() => onNewChat?.() || handleAddProject(onProjectChange)}
                >
                  <NewSessionIcon />
                  <span>{t("newSessionTitle") || (isRu ? "Новая сессия" : "New Chat")}</span>
                </button>

                <button
                  type="button"
                  className="welcome__secondary-btn"
                  onClick={() => onOpenSearch?.()}
                >
                  <SearchIcon />
                  <span>{isRu ? "Командная строка" : "Command Palette"}</span>
                  <kbd className="welcome__key-kbd">Ctrl+P</kbd>
                </button>

                <button
                  type="button"
                  className="welcome__secondary-btn"
                  onClick={() => onOpenSettingsTab?.("mcp") || setSettingsOpen(true)}
                >
                  <span className="welcome__mcp-dot" />
                  <span>MCP Hub</span>
                </button>

                <button
                  type="button"
                  className="welcome__secondary-btn"
                  onClick={() => onOpenSettingsTab?.("general") || setSettingsOpen(true)}
                >
                  <SettingsIcon />
                  <span>{t("settings") || (isRu ? "Настройки" : "Settings")}</span>
                </button>
              </div>
            </section>

            {/* Feature Showcase Grid */}
            <section className="welcome__features-section">
              <div className="welcome__section-header">
                <h2 className="welcome__section-title">
                  {isRu ? "Ключевые возможности Premire" : "Core Studio Capabilities"}
                </h2>
                <span className="welcome__section-tag">
                  {isRu ? "6 архитектурных преимуществ" : "6 Architecture Highlights"}
                </span>
              </div>

              <div className="welcome__features-grid">
                {features.map((feat) => (
                  <div key={feat.id} className="welcome__feature-card">
                    <div className="welcome__feature-header">
                      <div className="welcome__feature-icon">{feat.icon}</div>
                      <span className="welcome__feature-badge">{feat.badge}</span>
                    </div>
                    <h3 className="welcome__feature-title">{feat.title}</h3>
                    <p className="welcome__feature-desc">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Projects (if available) */}
            {projects.length > 0 && (
              <section className="welcome__recent-section">
                <div className="welcome__section-header">
                  <h2 className="welcome__section-title">
                    {isRu ? "Недавние проекты" : "Recent Workspaces"}
                  </h2>
                  <span className="welcome__section-tag">{projects.length} {isRu ? "проектов" : "workspaces"}</span>
                </div>
                <div className="welcome__recent-list">
                  {projects.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="welcome__recent-item"
                      onClick={() => handlePickProject(p.id, onProjectChange)}
                    >
                      <div className="welcome__recent-icon">
                        <FolderOpenStrokeIcon size={16} />
                      </div>
                      <div className="welcome__recent-info">
                        <span className="welcome__recent-name">{p.name || "Workspace"}</span>
                        <span className="welcome__recent-path">{p.path}</span>
                      </div>
                      <span className="welcome__recent-arrow">→</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Keyboard Shortcuts Reference */}
            <section className="welcome__shortcuts-section">
              <div className="welcome__section-header">
                <h2 className="welcome__section-title">
                  {isRu ? "Быстрые клавиши" : "Keyboard Shortcuts"}
                </h2>
              </div>
              <div className="welcome__shortcuts-grid">
                {shortcuts.map((sc, i) => (
                  <div key={i} className="welcome__shortcut-item">
                    <span className="welcome__shortcut-label">{sc.label}</span>
                    <kbd className="welcome__shortcut-kbd">{sc.key}</kbd>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
