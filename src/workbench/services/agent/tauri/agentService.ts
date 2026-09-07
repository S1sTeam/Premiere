// Typed Tauri adapter for agent conversation commands.
import { invoke } from "@tauri-apps/api/core";
import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";
import type { ContentPart } from "@/workbench/common/conversation";
import { getCurrentConfig, setCurrentConfig } from "@/workbench/services/aiProviders/tauri/aiProviderRuntimeState";
import { appendMessageToActiveChat, getBrowserChatRecord, saveBrowserChatRecord } from "@/workbench/services/chat/tauri/chatService";
import { activeChatId } from "@/workbench/services/chat/tauri/chatRuntimeState";
import { emitAgentBusy, emitAgentEvent } from "../browser/agentEventService";
import type { AgentContextUsage, AgentSendResult, SubAgentTraceEvent } from "../common/agent";
import type { AgentFileChange, RollbackPreview } from "../common/agentFileChanges";

let browserAbortController: AbortController | null = null;

async function sendBrowserMessage(text: string): Promise<AgentSendResult> {
  let config = getCurrentConfig();
  let apiKey = config?.apiKey?.trim() || "";
  let baseUrl = (config?.baseUrl || "https://free.sysik.mom/v1").replace(/\/+$/, "");
  let model = config?.model || "";
  let providerId = config?.providerId || "premire";

  // If no valid apiKey in currentConfig, dynamically resolve from stored providers
  const needsResolution =
    !apiKey ||
    apiKey === "***" ||
    (providerId === "premire" && !apiKey) ||
    (baseUrl.includes("sysik.mom") && !apiKey);

  if (needsResolution) {
    try {
      const raw = localStorage.getItem("premire_browser_providers") || localStorage.getItem("premire_providers");
      if (raw) {
        const providers: any[] = JSON.parse(raw);
        const lowerModel = model.toLowerCase();
        
        // 1. Try matching provider by providerId or baseUrl
        let prov = providers.find(
          (p) => p.apiKey?.trim() && p.apiKey !== "***" && (p.id === providerId || (p.baseUrl && p.baseUrl.replace(/\/+$/, "") === baseUrl)),
        );

        // 2. If model clearly matches a provider (e.g. groq models or customModels)
        if (!prov && model) {
          prov =
            providers.find(
              (p) => p.apiKey?.trim() && p.apiKey !== "***" && (p.model === model || p.customModels?.some((cm: any) => cm.key === model)),
            ) ||
            providers.find(
              (p) =>
                p.apiKey?.trim() &&
                p.apiKey !== "***" &&
                (p.id === "groq" || p.baseUrl?.includes("groq.com")) &&
                (lowerModel.includes("llama") || lowerModel.includes("mixtral") || lowerModel.includes("gemma")),
            );
        }

        // 3. If still not found, check if there is any configured provider with a valid apiKey
        if (!prov) {
          prov = providers.find((p) => p.apiKey?.trim() && p.apiKey !== "***");
        }

        if (prov) {
          apiKey = prov.apiKey.trim();
          if (prov.baseUrl) baseUrl = prov.baseUrl.replace(/\/+$/, "");
          if (prov.id) providerId = prov.id;
          const isGroqProv = providerId === "groq" || baseUrl.includes("groq.com");
          if (!model || model === "sonnet-5" || (isGroqProv && model.includes("claude"))) {
            model = prov.model || (isGroqProv ? "llama-3.3-70b-versatile" : "gpt-4o");
          }
          
          config = {
            ...(config || {}),
            apiKey,
            baseUrl,
            model,
            providerId,
            cwd: config?.cwd || "C:/Users/Developer/Desktop/Premire",
            autoApprove: config?.autoApprove ?? true,
          };
          setCurrentConfig(config);
        }
      }
    } catch {}
  }

  // Fallback default model if not specified or incompatible with provider
  const isGroq = providerId === "groq" || baseUrl.includes("groq.com");
  if (!model || (isGroq && (model === "sonnet-5" || model.includes("claude")))) {
    if (isGroq) {
      model = "llama-3.3-70b-versatile";
    } else {
      model = "sonnet-5";
    }
  }

  appendMessageToActiveChat({ role: "user", content: text, createdAt: Date.now() });
  const record = activeChatId ? getBrowserChatRecord(activeChatId) : null;
  const userMsgIdx = record ? record.messages.length - 1 : 0;

  emitAgentBusy(true);
  emitAgentEvent({ kind: "user", text, index: userMsgIdx });

  if (!apiKey || apiKey === "***") {
    setTimeout(() => {
      const provId = providerId || (baseUrl.includes("sysik.mom") ? "premire" : "ai");
      const lowerModel = model.toLowerCase();
      let warning = "";
      if (
        provId === "groq" ||
        baseUrl.includes("groq.com") ||
        lowerModel.includes("llama") ||
        lowerModel.includes("mixtral") ||
        lowerModel.includes("gemma")
      ) {
        warning =
          "⚠️ **Требуется API-ключ для Groq**\n\nВы выбрали модель от **Groq**, но API-ключ не указан или не сохранён.\n\n1. Откройте **Настройки** (Иконка ⚙️ -> **Провайдеры** -> выберите или добавьте **Groq**).\n2. Вставьте ваш ключ (бесплатно выдаётся в [GroqCloud Console](https://console.groq.com/keys)).\n3. Нажмите **Сохранить**.";
      } else if (provId === "premire" || baseUrl.includes("sysik.mom")) {
        warning =
          "⚠️ **Требуется API-ключ для Premire AI**\n\nПожалуйста, укажите ваш API-ключ в **Настройках** (Иконка ⚙️ -> **Провайдеры** -> **Premire AI** -> Подключить/Изменить).\n\nВы можете бесплатно получить ключ на [https://free.sysik.mom](https://free.sysik.mom).";
      } else {
        warning = `⚠️ **Требуется API-ключ**\n\nДля провайдера **${provId}** не указан API-ключ.\n\nПожалуйста, укажите его в **Настройках** (Иконка ⚙️ -> **Провайдеры** -> Подключить/Изменить).`;
      }
      emitAgentEvent({ kind: "assistant-start" });
      emitAgentEvent({ kind: "assistant-chunk", text: warning });
      emitAgentEvent({ kind: "assistant-end" });
      emitAgentBusy(false);
      appendMessageToActiveChat({ role: "assistant", content: warning, createdAt: Date.now() });
    }, 100);
    return { ok: true };
  }

  // Build message history from active chat record
  const history = (record?.messages ?? []).slice(-10).map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));
  if (!history.some((m) => m.role === "user" && m.content === text)) {
    history.push({ role: "user", content: text });
  }

  browserAbortController = new AbortController();
  const signal = browserAbortController.signal;

  (async () => {
    let fullReply = "";
    try {
      emitAgentEvent({ kind: "assistant-start" });

      const chatUrl = `${baseUrl}/chat/completions`;
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(chatUrl)}`;
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: history,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || errData?.message || `Ошибка сервера HTTP ${response.status}`;
        const formattedErr = `❌ ${errMsg}`;
        emitAgentEvent({ kind: "assistant-chunk", text: formattedErr });
        appendMessageToActiveChat({ role: "assistant", content: formattedErr, createdAt: Date.now() });
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json") && !contentType.includes("text/event-stream")) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || JSON.stringify(data);
        fullReply = content;
        emitAgentEvent({ kind: "assistant-chunk", text: content });
        appendMessageToActiveChat({ role: "assistant", content: fullReply, createdAt: Date.now() });
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamEnded = false;

      if (reader) {
        try {
          while (!streamEnded) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              if (!trimmed.startsWith("data:")) continue;

              const payload = trimmed.replace(/^data:\s*/, "");
              if (payload === "[DONE]") {
                streamEnded = true;
                break;
              }

              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta;
                const chunk = delta?.content ?? delta?.reasoning_content ?? "";
                if (chunk) {
                  fullReply += chunk;
                  emitAgentEvent({ kind: "assistant-chunk", text: chunk });
                }
              } catch {
                // Ignore partial JSON chunks
              }
            }
          }
        } finally {
          reader.cancel().catch(() => {});
        }
      }

      if (!fullReply.trim()) {
        const emptyMsg = "⚠️ Модель вернула пустой ответ. Проверьте правильность модели и лимиты API-ключа.";
        emitAgentEvent({ kind: "assistant-chunk", text: emptyMsg });
        fullReply = emptyMsg;
      }

      appendMessageToActiveChat({ role: "assistant", content: fullReply, createdAt: Date.now() });
    } catch (err: any) {
      if (err.name === "AbortError") {
        emitAgentEvent({ kind: "stopped" });
      } else {
        const errText = `❌ Ошибка сети: ${err.message || String(err)}`;
        emitAgentEvent({ kind: "assistant-chunk", text: errText });
        appendMessageToActiveChat({ role: "assistant", content: errText, createdAt: Date.now() });
      }
    } finally {
      emitAgentEvent({ kind: "assistant-end" });
      emitAgentBusy(false);
      browserAbortController = null;
    }
  })();

  return { ok: true };
}

export const agentService = {
  send: async (text: string): Promise<AgentSendResult> => {
    if (isBrowserDevPreview) {
      return sendBrowserMessage(text);
    }
    try {
      await invoke("agent_send", { input: text, contentParts: null });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  sendParts: async (parts: ContentPart[], display?: string): Promise<AgentSendResult> => {
    const text = display ?? parts.map((p) => ("text" in p ? p.text : "")).join("\n");
    if (isBrowserDevPreview) {
      return sendBrowserMessage(text);
    }
    try {
      await invoke("agent_send", { input: text, contentParts: parts });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  updateTodo: async (context: string): Promise<AgentSendResult> => {
    if (isBrowserDevPreview) return { ok: true };
    try {
      await invoke("agent_update_todo", { context });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  stop: async (): Promise<void> => {
    if (isBrowserDevPreview) {
      if (browserAbortController) {
        browserAbortController.abort();
        browserAbortController = null;
      }
      emitAgentEvent({ kind: "stopped" });
      emitAgentEvent({ kind: "assistant-end" });
      emitAgentBusy(false);
      return Promise.resolve();
    }
    await invoke("agent_stop").catch(() => {});
  },

  reset: async (): Promise<void> => {
    if (isBrowserDevPreview) return Promise.resolve();
    await invoke("agent_reset").catch(() => {});
  },

  instantRevert: (index: number): Promise<RollbackPreview> =>
    invoke<RollbackPreview>("agent_instant_revert", { index }),

  revertUndo: async (): Promise<void> => {
    await invoke("agent_revert_undo").catch(() => {});
  },

  getFileChange: (toolCallId: string): Promise<AgentFileChange> =>
    invoke<AgentFileChange>("agent_file_change", { toolCallId }),

  acceptFileChange: (toolCallId: string): Promise<AgentFileChange> =>
    invoke<AgentFileChange>("agent_accept_file_change", { toolCallId }),

  rejectFileChange: (toolCallId: string): Promise<AgentFileChange> =>
    invoke<AgentFileChange>("agent_reject_file_change", { toolCallId }),

  getSubTrace: (callId: string): Promise<SubAgentTraceEvent[]> =>
    invoke<SubAgentTraceEvent[]>("agent_get_sub_trace", { callId }),

  estimateContextTokens: (): Promise<AgentContextUsage> => invoke<AgentContextUsage>("estimate_context_tokens"),
};
