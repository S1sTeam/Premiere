import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyCombo, ShortcutDef } from "@/platform/keybinding/common/keybinding";
import { appState } from "@/platform/storage/common/keyValueStore";
import { Loading } from "@/workbench/browser/loading/loadingView";
import { Titlebar } from "@/workbench/browser/parts/titlebar/titlebar";
import { useWorkspaceLayout } from "@/workbench/browser/useWorkbenchLayout";
import { Workbench, type WorkbenchContributions } from "@/workbench/browser/workbench";
import type { SettingsTab } from "@/workbench/common/preferences";
import { useAgentEvents } from "@/workbench/services/agent/browser/useAgentEvents";
import { useSendMessage } from "@/workbench/services/agent/browser/useSendMessage";
import {
  changeWorkingDirectory,
  updateReasoningEffort,
} from "@/workbench/services/aiProviders/browser/aiProviderConfiguration";
import { useModels } from "@/workbench/services/aiProviders/browser/useModels";
import type { VibeConfig } from "@/workbench/services/aiProviders/common/aiProvider";
import { loadChatWorkspace, recordToItems } from "@/workbench/services/chat/browser/chatWorkspace";
import { useChats } from "@/workbench/services/chat/browser/useChats";
import { useProjectChatsPreview } from "@/workbench/services/chat/browser/useProjectChatsPreview";
import type { ChatRecord } from "@/workbench/services/chat/common/chat";
import { useProjects } from "@/workbench/services/workspace/browser/useWorkspaces";
import type { Project } from "@/workbench/services/workspace/common/workspace";
import { workspaceService } from "@/workbench/services/workspace/tauri/workspaceService";
import { CreateWorkspaceDialog } from "@/workbench/contrib/workspaces/browser/createWorkspaceDialog";
import { FatalError } from "./fatalError/fatalErrorView";
import { useAppCommands } from "./useWorkbenchCommands";
import { useWorkbenchInitialization, type WorkbenchInitializationResult } from "./useWorkbenchInitialization";
import { AppProviders } from "./workbenchProviders";

type ProjectChangeCallback = (folder: string | null, projectId: string | null) => Promise<void>;

interface OnboardingSlotProps {
  onComplete: () => void;
  onLanguageChange: (language: string) => void;
}

interface WorkspaceWelcomeSlotProps {
  projects: Project[];
  activeProject: string | null;
  handlePickProject: (id: string, callback: ProjectChangeCallback) => void | Promise<void>;
  handleAddProject: (callback: ProjectChangeCallback) => void | Promise<void>;
  handleRemoveProject: (id: string, callback: ProjectChangeCallback) => void | Promise<void>;
  onProjectChange: ProjectChangeCallback;
  setSettingsOpen: (open: boolean) => void;
  onOpenSettingsTab?: (tab: string) => void;
  onOpenSearch?: () => void;
  onNewChat?: () => void;
  removingIds?: Set<string>;
}

interface QuickAccessSlotProps {
  folder: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onSwitchChat: (direction: "prev" | "next") => void;
  onToggleTerminal: () => void;
  onOpenFile?: (path: string) => void;
  onRevealFolder?: (path: string) => void;
  onCommand?: (id: string) => void;
}

interface PreferencesSlotProps {
  open: boolean;
  onClose: () => void;
  onProviderChanged?: (model: string, baseUrl: string, apiKey?: string, providerId?: string) => void;
  activeTab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
  onLanguageChange?: (language: string) => void;
  shortcuts?: ShortcutDef[];
  onUpdateBinding?: (id: string, combo: KeyCombo) => Promise<void>;
  onResetBinding?: (id: string) => Promise<void>;
}

export interface DesktopContributions {
  workbench: WorkbenchContributions;
  subscribeBrowserSessionVisibility?: (listener: (open: boolean) => void) => () => void;
  renderOnboarding: (props: OnboardingSlotProps) => React.ReactNode;
  renderWorkspaceWelcome: (props: WorkspaceWelcomeSlotProps) => React.ReactNode;
  renderQuickAccess: (props: QuickAccessSlotProps) => React.ReactNode;
  renderPreferences: (props: PreferencesSlotProps) => React.ReactNode;
}

interface DesktopApplicationProps {
  contributions: DesktopContributions;
  initializeWorkbench: () => Promise<WorkbenchInitializationResult>;
}

export function DesktopApplication({
  contributions,
  initializeWorkbench,
}: DesktopApplicationProps): React.ReactElement {
  const [state, setState] = useState<{ kind: "ok" } | { kind: "fatal"; error: string } | null>(null);
  const [config, setConfig] = useState<VibeConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Use clear, internationally understandable English for the first-run flow.
  // The user's saved language is loaded immediately below and still takes precedence.
  const [lang, setLang] = useState<string>("English");
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(() => {
    try {
      const v = localStorage.getItem("premire_kv:onboarding:completed");
      if (v !== null) return v === "true";
    } catch {}
    return true;
  });

  useEffect(() => {
    appState.get("settings:language").then((v) => {
      if (v && v !== "Russian") {
        setLang(v);
      } else {
        setLang("English");
        void appState.set("settings:language", "English");
      }
    }).catch(() => {});
    appState.get("onboarding:completed").then((v) => {
      setOnboardingCompleted(v === "true");
    }).catch(() => {
      setOnboardingCompleted(true);
    });
  }, []);

  useEffect(() => {
    const handler = () => setOnboardingCompleted(false);
    window.addEventListener("vibe:open-welcome-screen", handler);
    return () => window.removeEventListener("vibe:open-welcome-screen", handler);
  }, []);

  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [searchOpen, setSearchOpen] = useState(false);
  const [revealPath, setRevealPath] = useState<string | null>(null);

  const layout = useWorkspaceLayout();

  useEffect(() => {
    return contributions.subscribeBrowserSessionVisibility?.(layout.setBrowserOpen);
  }, [contributions, layout.setBrowserOpen]);

  const handleOpenSearch = useCallback(() => {
    setRevealPath(null);
    setSearchOpen(true);
  }, []);
  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);
  const handleOpenSettings = useCallback((tab?: string) => {
    if (tab) setSettingsTab(tab as SettingsTab);
    setSettingsOpen(true);
  }, []);
  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const {
    projects,
    setProjects,
    activeProject,
    setActiveProject,
    folder,
    setFolder,
    removingIds,
    handlePickProject,
    handleAddProject,
    handleCloseProject,
    handleRemoveProject,
    validateProjectPaths,
    setOnProjectChange,
    createProjectOpen,
    setCreateProjectOpen,
  } = useProjects();

  useEffect(() => {
    const handleRenamed = async (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string; name?: string }>).detail;
      if (detail?.id && detail?.name) {
        setProjects((prev) =>
          prev.map((p) => (p.id === detail.id ? { ...p, name: detail.name! } : p)),
        );
      }
      try {
        const list = await workspaceService.list();
        setProjects(list);
      } catch {}
    };
    window.addEventListener("premire:project-renamed", handleRenamed);
    window.addEventListener("vibe:workspace:renamed", handleRenamed);
    return () => {
      window.removeEventListener("premire:project-renamed", handleRenamed);
      window.removeEventListener("vibe:workspace:renamed", handleRenamed);
    };
  }, [setProjects]);

  const {
    chats,
    setChats,
    activeChat,
    setActiveChat,
    handlePickChat,
    handleNewChat,
    handleCloseChat: baseHandleCloseChat,
  } = useChats();

  const { hoveredProject, hoveredChats, hoverProject, dropChatFromPreview } = useProjectChatsPreview(projects);

  const handleCloseChat = useCallback(
    async (id: string, onChatChange: (record: ChatRecord | null) => void) => {
      dropChatFromPreview(id);
      await baseHandleCloseChat(id, onChatChange);
    },
    [baseHandleCloseChat, dropChatFromPreview],
  );

  const { handlePickModel } = useModels(config, setConfig, settingsOpen);
  const [reasoningEffort, setReasoningEffort] = useState<string | undefined>(config?.reasoningEffort ?? undefined);
  useEffect(() => {
    setReasoningEffort(config?.reasoningEffort ?? undefined);
  }, [config?.reasoningEffort]);
  const handleReasoningEffortChange = useCallback((effort: string | null) => {
    const val = effort ?? undefined;
    setReasoningEffort(val);
    updateReasoningEffort(effort);
    setConfig((c) => (c ? { ...c, reasoningEffort: val } : c));
  }, []);

  useEffect(() => {
    const onProvChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setConfig((prev) => ({
          ...(prev || {}),
          model: detail.model ?? prev?.model ?? "",
          baseUrl: detail.baseUrl ?? prev?.baseUrl ?? "",
          apiKey: detail.apiKey !== undefined ? detail.apiKey : prev?.apiKey ?? "",
          providerId: detail.providerId !== undefined ? detail.providerId : prev?.providerId ?? "premire",
          cwd: prev?.cwd || "C:/Users/Developer/Desktop/Premire",
          autoApprove: prev?.autoApprove ?? true,
        }));
      }
    };
    window.addEventListener("premire:provider-changed", onProvChanged);
    return () => window.removeEventListener("premire:provider-changed", onProvChanged);
  }, []);

  const { items, setItems, busy, streamingNow, pendingAttachments, pendingMentions } = useAgentEvents(
    useCallback(() => {}, []),
  );

  const { handleSubmit, handleStop } = useSendMessage({
    setItems,
    pendingAttachments,
    pendingMentions,
  });

  useWorkbenchInitialization({
    initializeWorkbench,
    setConfig,
    setFolder,
    setState,
    setProjects,
    setActiveProject,
    setChats,
    setActiveChat,
    setItems,
    validateProjectPaths,
  });

  const onProjectChange = useCallback(
    async (newFolder: string | null, projectId: string | null) => {
      setFolder(newFolder);
      if (!projectId) {
        setChats([]);
        setActiveChat(null);
        setItems([]);
        return;
      }
      if (newFolder) await changeWorkingDirectory(newFolder);
      const workspace = await loadChatWorkspace();
      setChats(workspace.chats);
      setActiveChat(workspace.activeChatId);
      setItems(workspace.record ? recordToItems(workspace.record) : []);
    },
    [setFolder, setChats, setActiveChat, setItems],
  );

  const handleProjectCreated = useCallback(
    async (newProj: Project) => {
      const list = await workspaceService.list();
      setProjects(list);
      setActiveProject(newProj.id);
      setFolder(newProj.path);
      await onProjectChange(newProj.path, newProj.id);
    },
    [setProjects, setActiveProject, setFolder, onProjectChange],
  );

  // Keep the periodic folder-existence check in useProjects aware of the
  // current onProjectChange so it can switch the active project when a
  // folder is deleted while the app is open.
  useEffect(() => {
    setOnProjectChange(onProjectChange);
  }, [onProjectChange, setOnProjectChange]);

  const handleSwitchChat = useCallback(
    (direction: "prev" | "next") => {
      if (chats.length <= 1) {
        handleNewChat(() => setItems([]));
        return;
      }
      const idx = chats.findIndex((c) => c.id === activeChat);
      const nextIdx =
        idx < 0
          ? 0
          : direction === "prev"
            ? (idx > 0 ? idx - 1 : chats.length - 1)
            : (idx < chats.length - 1 ? idx + 1 : 0);
      const nextChat = chats[nextIdx]!;
      handlePickChat(nextChat.id, (record) => {
        setItems(record ? recordToItems(record) : []);
      });
    },
    [chats, activeChat, handlePickChat, handleNewChat, setItems],
  );

  const handleNewChatCommand = useCallback(() => {
    setItems([]);
    handleNewChat(() => setItems([]));
    window.dispatchEvent(new CustomEvent("vibe:new-chat"));
  }, [handleNewChat, setItems]);

  const handleNewProjectCommand = useCallback(() => {
    handleAddProject(onProjectChange);
  }, [handleAddProject, onProjectChange]);

  const handleCloseProjectCommand = useCallback(() => {
    handleCloseProject();
    setChats([]);
    setActiveChat(null);
    setItems([]);
  }, [handleCloseProject, setChats, setActiveChat, setItems]);

  const handlePickProjectByIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= projects.length) return;
      const project = projects[index]!;
      handlePickProject(project.id, onProjectChange);
    },
    [projects, handlePickProject, onProjectChange],
  );

  const { handleCommand, shortcuts, updateBinding, resetBinding } = useAppCommands(layout, {
    newChat: handleNewChatCommand,
    clearChat: handleNewChatCommand,
    switchChat: handleSwitchChat,
    newProject: handleNewProjectCommand,
    closeProject: handleCloseProjectCommand,
    pickProjectByIndex: handlePickProjectByIndex,
    openSettings: handleOpenSettings,
    closeSettings: handleCloseSettings,
    openSearch: handleOpenSearch,
  });

  const currentProject = useMemo(
    () => projects.find((p) => p.id === activeProject || (Boolean(folder) && p.path === folder)),
    [projects, activeProject, folder],
  );
  const projectName = currentProject?.name;

  if (!state) return <Loading />;
  if (state.kind === "fatal") return <FatalError error={state.error} />;
  if (!config) return <Loading />;
  if (onboardingCompleted === null) return <Loading />;

  if (!onboardingCompleted) {
    return (
      <AppProviders lang={lang}>
        {contributions.renderOnboarding({
          onComplete: () => setOnboardingCompleted(true),
          onLanguageChange: setLang,
        })}
      </AppProviders>
    );
  }

  const titlebar = (
    <Titlebar
      chatSideOpen={layout.chatSideOpen}
      onToggleChatSide={layout.handleToggleChatSide}
      onNewChat={handleNewChatCommand}
      terminalOpen={layout.terminalOpen}
      onToggleTerminal={() => layout.setTerminalOpen((o) => !o)}
      searchInCodeOpen={layout.searchInCodeOpen}
      onToggleSearchInCode={layout.handleToggleSearchInCode}
      fileTreeOpen={layout.fileTreeOpen}
      onToggleFileTree={() => layout.setFileTreeOpen((o) => !o)}
      gitPanelOpen={layout.gitPanelOpen}
      onToggleGitPanel={layout.handleToggleGitPanel}
      folder={folder}
      projectName={projectName}
      onSearchOpen={handleOpenSearch}
      onOpenSettings={handleOpenSettings}
    />
  );

  const searchPopup = searchOpen
    ? contributions.renderQuickAccess({
        folder,
        onClose: handleCloseSearch,
        onNewChat: () => {
          handleNewChatCommand();
          setSearchOpen(false);
        },
        onSwitchChat: (direction) => {
          handleSwitchChat(direction);
          setSearchOpen(false);
        },
        onToggleTerminal: () => {
          layout.setTerminalOpen((open) => !open);
          setSearchOpen(false);
        },
        onOpenFile: layout.handleOpenFile,
        onRevealFolder: setRevealPath,
        onCommand: handleCommand,
      })
    : null;

  const settings = contributions.renderPreferences({
    open: settingsOpen,
    onClose: handleCloseSettings,
    activeTab: settingsTab,
    onProviderChanged: (model, baseUrl, apiKey, providerId) => {
      setConfig((current) => {
        const next: VibeConfig = current
          ? {
              ...current,
              model,
              baseUrl,
              apiKey: apiKey !== undefined ? apiKey : current.apiKey,
              providerId: providerId !== undefined ? providerId : current.providerId,
            }
          : {
              model,
              baseUrl,
              apiKey: apiKey || "",
              providerId: providerId || "premire",
              cwd: "C:/Users/Developer/Desktop/Premire",
              autoApprove: true,
            };
        return next;
      });
    },
    onTabChange: setSettingsTab,
    onLanguageChange: setLang,
    shortcuts,
    onUpdateBinding: updateBinding,
    onResetBinding: resetBinding,
  });

  if (!activeProject) {
    return (
      <AppProviders lang={lang}>
        <div className="app">
          {titlebar}
          {searchPopup}
          {contributions.renderWorkspaceWelcome({
            projects,
            activeProject,
            handlePickProject,
            handleAddProject,
            handleRemoveProject,
            onProjectChange,
            setSettingsOpen,
            onOpenSettingsTab: handleOpenSettings,
            onOpenSearch: handleOpenSearch,
            onNewChat: handleNewChatCommand,
            removingIds,
          })}
          {settings}
          <CreateWorkspaceDialog
            isOpen={createProjectOpen}
            onClose={() => setCreateProjectOpen(false)}
            onCreate={handleProjectCreated}
          />
        </div>
      </AppProviders>
    );
  }

  return (
    <AppProviders lang={lang}>
      <div className="app">
        {titlebar}
        {searchPopup}
        <Workbench
          contributions={contributions.workbench}
          revealPath={revealPath}
          projects={projects}
          activeProject={activeProject}
          removingIds={removingIds}
          chatSideOpen={layout.chatSideOpen}
          setChatSideOpen={layout.setChatSideOpen}
          chatSideSticky={layout.chatSideSticky}
          setChatSideSticky={layout.setChatSideSticky}
          handlePickProject={handlePickProject}
          handleHoverProject={hoverProject}
          hoveredProject={hoveredProject}
          hoveredChats={hoveredChats}
          handleAddProject={handleAddProject}
          handleRemoveProject={handleRemoveProject}
          onProjectChange={onProjectChange}
          setSettingsOpen={setSettingsOpen}
          onOpenSettings={handleOpenSettings}
          sidebarWidth={layout.sidebarWidth}
          handleSidebarResize={layout.setSidebarWidth}
          activeChat={activeChat}
          folder={folder}
          config={config}
          handlePickChat={handlePickChat}
          handleNewChat={handleNewChat}
          handleCloseChat={handleCloseChat}
          items={items}
          streamingNow={streamingNow}
          busy={busy}
          handlePickModel={handlePickModel}
          handleSubmit={handleSubmit}
          onStop={handleStop}
          reasoningEffort={reasoningEffort}
          onReasoningEffortChange={handleReasoningEffortChange}
          terminalOpen={layout.terminalOpen}
          browserOpen={layout.browserOpen}
          fileTreeOpen={layout.fileTreeOpen}
          gitPanelOpen={layout.gitPanelOpen}
          openFiles={layout.openFiles}
          activeFile={layout.activeFile}
          previewFile={layout.previewFile}
          handleOpenFile={layout.handleOpenFile}
          handleCloseFile={layout.handleCloseFile}
          handleActivateFile={layout.handleActivateFile}
          onPinFile={layout.handlePinFile}
          setItems={setItems}
          setProjects={setProjects}
          searchInCodeOpen={layout.searchInCodeOpen}
          onCloseSearchInCode={() => layout.setSearchInCodeOpen(false)}
          onCloseGitPanel={() => layout.setGitPanelOpen(false)}
          onToggleFileTree={() => layout.setFileTreeOpen(!layout.fileTreeOpen)}
          onToggleSearchInCode={() => layout.setSearchInCodeOpen(!layout.searchInCodeOpen)}
          onToggleGitPanel={() => layout.setGitPanelOpen(!layout.gitPanelOpen)}
          onToggleTerminal={() => layout.setTerminalOpen(!layout.terminalOpen)}
          onToggleBrowser={() => layout.setBrowserOpen(!layout.browserOpen)}
          gotoLine={layout.gotoLine}
          gotoColumn={layout.gotoColumn}
          gotoMatchLength={layout.gotoMatchLength}
        />
        {settings}
        <CreateWorkspaceDialog
          isOpen={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          onCreate={handleProjectCreated}
        />
      </div>
    </AppProviders>
  );
}
