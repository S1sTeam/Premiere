import type * as monaco from "monaco-editor";
import { useCallback, useRef } from "react";
import { getLanguage } from "@/base/browser/ui/icons/iconResolver";
import type { ThemeVars } from "@/platform/theme/themeRegistry";
import { makeMonacoTheme } from "../monacoThemes";
import { attachAgentQuickFixClick, registerAgentQuickFix } from "./editorQuickFix";
import type { EditorRefs, InlineSession, SetContent } from "./editorState";
import { attachInlineVibeShortcuts } from "./inlineVibeShortcuts";
import { loadTypeDefinitions, MODEL_CACHE, preloadLocalImports } from "./monacoModels";

interface MountOptions {
  path: string;
  cwd?: string;
  content: string;
  original: string;
  gotoLine?: number;
  gotoColumn?: number;
  gotoMatchLength?: number;
  themeName: string;
  themeVars: ThemeVars;
  isDark: boolean;
  refs: EditorRefs;
  setContent: SetContent;
  loadingRef: React.MutableRefObject<boolean>;
  sessionRef: React.MutableRefObject<InlineSession | null>;
  updateGhostTextRef: React.MutableRefObject<() => void>;
  actions: {
    trigger: () => void;
    accept: () => void;
    reject: () => void;
    navigate: (direction: "next" | "prev") => void;
  };
}

export function useEditorMount(options: MountOptions) {
  const actionsRef = useRef(options.actions);
  actionsRef.current = options.actions;

  const beforeMount = useCallback(
    (m: typeof monaco) => {
      options.refs.monaco.current = m;
      m.editor.defineTheme(options.themeName, makeMonacoTheme(options.themeVars, options.isDark));
      if (options.cwd) void loadTypeDefinitions(m, options.cwd);
    },
    [options.cwd, options.isDark, options.refs, options.themeName, options.themeVars],
  );

  const onMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, m: typeof monaco) => {
      options.refs.editor.current = editor;
      options.refs.monaco.current = m;
      attachInlineVibeShortcuts(editor, m, options.sessionRef, actionsRef);
      registerAgentQuickFix(m);
      attachAgentQuickFixClick(editor);

      try {
        const uri = m.Uri.file(options.path.replace(/\\/g, "/"));
        let model = m.editor.getModel(uri);
        if (!model) model = m.editor.createModel(options.content, getLanguage(options.path), uri);
        editor.setModel(model);
        MODEL_CACHE.set(options.path, { model, originalContent: options.original, workspace: options.cwd });
        if (options.cwd) void loadTypeDefinitions(m, options.cwd);
        void preloadLocalImports(m, options.content, options.path, options.cwd);

        editor.onDidChangeModelContent(() => {
          if (!options.loadingRef.current) options.setContent(editor.getValue());
          options.updateGhostTextRef.current();
        });

        const emitCursor = () => {
          const pos = editor.getPosition();
          if (pos) {
            window.dispatchEvent(
              new CustomEvent("premire:editor-cursor", {
                detail: { line: pos.lineNumber, col: pos.column, path: options.path },
              }),
            );
          }
        };
        emitCursor();

        editor.onDidChangeCursorPosition(() => {
          options.updateGhostTextRef.current();
          emitCursor();
        });

        const handleGotoLine = () => {
          editor.focus();
          editor.getAction("editor.action.gotoLine")?.run();
        };
        window.addEventListener("premire:editor-goto-line", handleGotoLine);
        editor.onDidDispose(() => {
          window.removeEventListener("premire:editor-goto-line", handleGotoLine);
        });

        // Register Premire AI context menu actions in Monaco
        editor.addAction({
          id: "premire.explainSelection",
          label: "Premire AI: Explain Code",
          keybindings: [m.KeyMod.CtrlCmd | m.KeyMod.Shift | m.KeyCode.KeyE],
          contextMenuGroupId: "premire_ai",
          contextMenuOrder: 1,
          run: (ed) => {
            const selection = ed.getSelection();
            const selectedText =
              selection && !selection.isEmpty() ? ed.getModel()?.getValueInRange(selection) : ed.getValue();
            window.dispatchEvent(
              new CustomEvent("premire:composer-command", {
                detail: {
                  prompt: `/explain\n\n\`\`\`${getLanguage(options.path)}\n// ${options.path}\n${selectedText}\n\`\`\``,
                },
              }),
            );
          },
        });

        editor.addAction({
          id: "premire.refactorSelection",
          label: "Premire AI: Refactor",
          keybindings: [m.KeyMod.CtrlCmd | m.KeyMod.Shift | m.KeyCode.KeyR],
          contextMenuGroupId: "premire_ai",
          contextMenuOrder: 2,
          run: (ed) => {
            const selection = ed.getSelection();
            const selectedText =
              selection && !selection.isEmpty() ? ed.getModel()?.getValueInRange(selection) : ed.getValue();
            window.dispatchEvent(
              new CustomEvent("premire:composer-command", {
                detail: {
                  prompt: `/refactor\n\n\`\`\`${getLanguage(options.path)}\n// ${options.path}\n${selectedText}\n\`\`\``,
                },
              }),
            );
          },
        });

        editor.addAction({
          id: "premire.generateTests",
          label: "Premire AI: Generate Unit Tests",
          keybindings: [m.KeyMod.CtrlCmd | m.KeyMod.Shift | m.KeyCode.KeyT],
          contextMenuGroupId: "premire_ai",
          contextMenuOrder: 3,
          run: (ed) => {
            const selection = ed.getSelection();
            const selectedText =
              selection && !selection.isEmpty() ? ed.getModel()?.getValueInRange(selection) : ed.getValue();
            window.dispatchEvent(
              new CustomEvent("premire:composer-command", {
                detail: {
                  prompt: `/test\n\n\`\`\`${getLanguage(options.path)}\n// ${options.path}\n${selectedText}\n\`\`\``,
                },
              }),
            );
          },
        });

        if (options.gotoLine !== undefined) {
          const column = options.gotoColumn ?? 1;
          editor.revealLineInCenter(options.gotoLine);
          editor.setPosition({ lineNumber: options.gotoLine, column });
          if (options.gotoColumn !== undefined && options.gotoMatchLength !== undefined) {
            editor.setSelection(
              new m.Range(options.gotoLine, column, options.gotoLine, column + options.gotoMatchLength),
            );
          }
          editor.focus();
        }
        setTimeout(() => options.updateGhostTextRef.current(), 50);
      } catch (error) {
        console.error("Error mounting editor:", error);
      }
    },
    [options],
  );

  return { beforeMount, onMount };
}
