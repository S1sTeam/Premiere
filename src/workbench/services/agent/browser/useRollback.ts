// Rollback (instant revert) use case: revert conversation to a message index
// and allow restoring the removed items.
import { useCallback, useState } from "react";
import type { HistoryItem } from "@/workbench/common/conversation";
import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";
import { activeChatId } from "@/workbench/services/chat/tauri/chatRuntimeState";
import { getBrowserChatRecord, saveBrowserChatRecord } from "@/workbench/services/chat/tauri/chatService";
import type { FileSnapshot } from "../common/agentFileChanges";
import { agentService } from "../tauri/agentService";

export function useRollback(setItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>) {
  const [rollbackIndex, setRollbackIndex] = useState<number | null>(null);
  const [rollbackText, setRollbackText] = useState("");
  const [rollbackRevision, setRollbackRevision] = useState(0);
  const [rollbackRemovedItems, setRollbackRemovedItems] = useState<HistoryItem[]>([]);
  const [rollbackChanged, setRollbackChanged] = useState<FileSnapshot[]>([]);
  const [rollbackRemoved, setRollbackRemoved] = useState(0);

  const clearRollback = useCallback(() => {
    setRollbackIndex(null);
    setRollbackText("");
    setRollbackRemovedItems([]);
    setRollbackChanged([]);
    setRollbackRemoved(0);
  }, []);

  const revertToItem = useCallback(
    async (items: HistoryItem[], id: string) => {
      const idx = items.findIndex((it) => it.id === id);
      if (idx < 0) return;
      const item = items[idx]!;

      // 1. Capture removed items and update UI state immediately
      const removed = items.slice(idx);
      setRollbackRemovedItems(removed);
      setItems((prev) => prev.slice(0, idx));
      setRollbackIndex(idx);
      setRollbackText(item.text);
      setRollbackRevision((r) => r + 1);

      const removedUserCount = removed.filter((it) => it.kind === "user").length;
      setRollbackRemoved(removedUserCount);

      // 2. Synchronize browser chat storage
      if (activeChatId) {
        try {
          const rec = getBrowserChatRecord(activeChatId);
          if (rec && Array.isArray(rec.messages)) {
            rec.messages = rec.messages.slice(0, idx);
            rec.updatedAt = Date.now();
            saveBrowserChatRecord(activeChatId, rec);
          }
        } catch {}
      }

      // 3. Attempt native file instant revert in Tauri if available
      if (!isBrowserDevPreview) {
        try {
          const targetMsgIndex = typeof item.msgIndex === "number" ? item.msgIndex : idx;
          const result = await agentService.instantRevert(targetMsgIndex);
          if (result && Array.isArray(result.filesChanged)) {
            setRollbackChanged(result.filesChanged);
          }
        } catch (e) {
          console.warn("[Premire] instantRevert native warning:", e);
        }
      }
    },
    [setItems],
  );

  const undoRollback = useCallback(async () => {
    if (rollbackIndex === null) return;

    // 1. Restore removed items in UI
    setItems((prev) => [...prev, ...rollbackRemovedItems]);

    // 2. Restore in browser chat storage if needed
    if (activeChatId) {
      try {
        const rec = getBrowserChatRecord(activeChatId);
        if (rec && Array.isArray(rec.messages)) {
          for (const item of rollbackRemovedItems) {
            if (item.kind === "user" || item.kind === "assistant") {
              rec.messages.push({
                role: item.kind,
                content: item.text,
                createdAt: item.startedAt || Date.now(),
              });
            }
          }
          rec.updatedAt = Date.now();
          saveBrowserChatRecord(activeChatId, rec);
        }
      } catch {}
    }

    // 3. Native revert undo in Tauri
    if (!isBrowserDevPreview) {
      try {
        await agentService.revertUndo();
      } catch {}
    }

    clearRollback();
  }, [rollbackIndex, rollbackRemovedItems, clearRollback, setItems]);

  return {
    rollbackIndex,
    rollbackText,
    rollbackRevision,
    rollbackChanged,
    rollbackRemoved,
    clearRollback,
    revertToItem,
    undoRollback,
  };
}
