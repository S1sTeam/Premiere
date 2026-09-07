// Typed Tauri adapter for chat persistence commands (owned by the chats feature).
import { invoke } from "@tauri-apps/api/core";
import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";
import type { ChatMessage, ChatRecord, ChatSummary } from "../common/chat";
import { activeChatId, setActiveChatId } from "./chatRuntimeState";

const ACTIVE_CHAT_KEY = "premire:activeChatId";
const BROWSER_CHATS_STORE_KEY = "premire_chats_store_v1";
const BROWSER_CHAT_RECORD_PREFIX = "premire_chat_record_";

function getBrowserChats(): ChatSummary[] {
  try {
    const raw = localStorage.getItem(BROWSER_CHATS_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveBrowserChats(chats: ChatSummary[]): void {
  try {
    localStorage.setItem(BROWSER_CHATS_STORE_KEY, JSON.stringify(chats));
  } catch {}
}

export function getBrowserChatRecord(id: string): ChatRecord | null {
  try {
    const raw = localStorage.getItem(BROWSER_CHAT_RECORD_PREFIX + id);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveBrowserChatRecord(id: string, record: ChatRecord): void {
  try {
    localStorage.setItem(BROWSER_CHAT_RECORD_PREFIX + id, JSON.stringify(record));
  } catch {}
}

export function appendMessageToActiveChat(msg: ChatMessage): void {
  if (!activeChatId) return;
  let record = getBrowserChatRecord(activeChatId);
  if (!record) {
    record = {
      id: activeChatId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
  }
  record.messages.push(msg);
  record.updatedAt = Date.now();
  saveBrowserChatRecord(activeChatId, record);
  void chatService.saveActive();
}

async function saveActiveChatMessages(id: string): Promise<void> {
  if (isBrowserDevPreview) {
    await chatService.saveActive();
    return;
  }
  try {
    const msgs = await invoke<ChatMessage[]>("agent_get_messages");
    const toSave = msgs.filter((m) => m.role !== "system");
    await invoke("chats_save", { id, messages: toSave });
  } catch {
    /* ignore */
  }
}

export const chatService = {
  list: (): Promise<ChatSummary[]> => {
    if (isBrowserDevPreview) {
      return Promise.resolve(getBrowserChats());
    }
    return invoke<ChatSummary[]>("chats_list");
  },

  /** Persist the full current agent conversation into the active chat. */
  saveActive: async (): Promise<void> => {
    if (!activeChatId) return;
    if (isBrowserDevPreview) {
      const record = getBrowserChatRecord(activeChatId);
      if (!record) return;
      const list = getBrowserChats();
      const chat = list.find((c) => c.id === activeChatId);
      if (chat) {
        chat.messageCount = record.messages.length;
        chat.updatedAt = Date.now();
        if (chat.title === "New Chat" && record.messages.length > 0) {
          const firstUser = record.messages.find((m) => m.role === "user");
          if (firstUser && typeof firstUser.content === "string") {
            chat.title = firstUser.content.slice(0, 36).trim() || chat.title;
            record.title = chat.title;
            saveBrowserChatRecord(activeChatId, record);
          }
        }
        saveBrowserChats(list);
        window.dispatchEvent(new CustomEvent("vibe:chats:updated"));
      }
      return;
    }
    try {
      const msgs = await invoke<ChatMessage[]>("agent_get_messages");
      await invoke("chats_save", { id: activeChatId, messages: msgs });
    } catch {
      /* ignore */
    }
  },

  /** Id of the chat that was active in the previous session, if any. */
  lastActiveChatId: (): string | null => localStorage.getItem(ACTIVE_CHAT_KEY),

  clearLastActiveChatId: (): void => {
    localStorage.removeItem(ACTIVE_CHAT_KEY);
  },

  listForProject: (projectId: string): Promise<ChatSummary[]> => {
    if (isBrowserDevPreview) {
      return Promise.resolve(getBrowserChats());
    }
    return invoke<ChatSummary[]>("chats_list_for_project", { projectId });
  },

  new: async (): Promise<ChatSummary | null> => {
    if (activeChatId) {
      await saveActiveChatMessages(activeChatId);
    }
    if (isBrowserDevPreview) {
      const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const fresh: ChatSummary = {
        id,
        title: "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        pinned: false,
        archived: false,
      };
      const list = getBrowserChats();
      list.unshift(fresh);
      saveBrowserChats(list);
      saveBrowserChatRecord(id, {
        id,
        title: fresh.title,
        createdAt: fresh.createdAt,
        updatedAt: fresh.updatedAt,
        messages: [],
      });
      setActiveChatId(id);
      localStorage.setItem(ACTIVE_CHAT_KEY, id);
      window.dispatchEvent(new CustomEvent("vibe:chats:updated"));
      return fresh;
    }

    // Reset agent for fresh conversation
    await invoke("agent_reset").catch(() => {});

    // Create a new chat (reuses current if empty, otherwise allocates new ID)
    const result = await invoke<ChatSummary | null>("chats_new");
    if (result) {
      setActiveChatId(result.id);
      localStorage.setItem(ACTIVE_CHAT_KEY, result.id);
    }
    return result;
  },

  open: async (id: string): Promise<ChatRecord | null> => {
    if (activeChatId && activeChatId !== id) {
      await saveActiveChatMessages(activeChatId);
    }
    if (isBrowserDevPreview) {
      let record = getBrowserChatRecord(id);
      if (!record) {
        const list = getBrowserChats();
        const summary = list.find((c) => c.id === id);
        record = {
          id,
          title: summary?.title ?? "New Chat",
          createdAt: summary?.createdAt ?? Date.now(),
          updatedAt: summary?.updatedAt ?? Date.now(),
          messages: [],
        };
        saveBrowserChatRecord(id, record);
      }
      setActiveChatId(id);
      localStorage.setItem(ACTIVE_CHAT_KEY, id);
      return record;
    }

    const record = await invoke<ChatRecord | null>("chats_open", { id });
    if (!record) return null;
    setActiveChatId(id);
    localStorage.setItem(ACTIVE_CHAT_KEY, id);
    // Restore messages into the Rust agent
    if (Array.isArray(record.messages)) {
      await invoke("agent_set_chat_state", {
        messages: record.messages,
        fileSnapshots: record.fileSnapshots ?? [],
      }).catch(() => {});
    }
    return record;
  },

  delete: (id: string): Promise<void> => {
    if (isBrowserDevPreview) {
      const list = getBrowserChats().filter((c) => c.id !== id);
      saveBrowserChats(list);
      try {
        localStorage.removeItem(BROWSER_CHAT_RECORD_PREFIX + id);
      } catch {}
      if (activeChatId === id) {
        const nextId = list[0]?.id ?? null;
        setActiveChatId(nextId);
        if (nextId) localStorage.setItem(ACTIVE_CHAT_KEY, nextId);
        else localStorage.removeItem(ACTIVE_CHAT_KEY);
      }
      window.dispatchEvent(new CustomEvent("vibe:chats:updated"));
      return Promise.resolve();
    }
    return invoke("chats_delete", { id });
  },

  rename: (id: string, title: string): Promise<void> => {
    if (isBrowserDevPreview) {
      const list = getBrowserChats().map((c) => (c.id === id ? { ...c, title } : c));
      saveBrowserChats(list);
      const record = getBrowserChatRecord(id);
      if (record) {
        record.title = title;
        saveBrowserChatRecord(id, record);
      }
      window.dispatchEvent(new CustomEvent("vibe:chats:updated"));
      return Promise.resolve();
    }
    return invoke("chats_rename", { id, title });
  },
};

/** Subscribe to backend chat-list updates. */
export function onChatsUpdated(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("vibe:chats:updated", handler);
  return () => window.removeEventListener("vibe:chats:updated", handler);
}
