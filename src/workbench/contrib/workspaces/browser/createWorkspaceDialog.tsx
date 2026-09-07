import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/platform/localization/localizationService";
import { workspaceService } from "@/workbench/services/workspace/tauri/workspaceService";
import type { Project } from "@/workbench/services/workspace/common/workspace";
import "./createWorkspaceDialog.css";

export interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void | Promise<void>;
}

const DEFAULT_BASE_DIR = "C:/Users/Developer/Desktop";

export function CreateWorkspaceDialog({
  isOpen,
  onClose,
  onCreate,
}: CreateWorkspaceDialogProps): React.ReactElement | null {
  const { t, lang } = useI18n();
  const isRu = lang === "Russian";
  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState(DEFAULT_BASE_DIR);
  const [userEditedPath, setUserEditedPath] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickingFolder, setPickingFolder] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setFolderPath(DEFAULT_BASE_DIR);
      setUserEditedPath(false);
      setSubmitting(false);
      setPickingFolder(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!userEditedPath) {
      const trimmed = val.trim();
      setFolderPath(trimmed ? `${DEFAULT_BASE_DIR}/${trimmed}` : DEFAULT_BASE_DIR);
    }
  };

  const handlePickFolder = async () => {
    if (pickingFolder) return;
    setPickingFolder(true);
    try {
      const selected = await workspaceService.pickFolder();
      if (selected) {
        const normalized = selected.replace(/\\/g, "/").replace(/\/+$/, "");
        setFolderPath(normalized);
        setUserEditedPath(true);
        const folderBase = normalized.split("/").filter(Boolean).pop();
        if (folderBase && (!name.trim() || name === "Project")) {
          setName(folderBase);
        }
      }
    } catch (err) {
      console.error("Failed to pick folder:", err);
    } finally {
      setPickingFolder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    try {
      const finalPath = folderPath.trim() || `${DEFAULT_BASE_DIR}/${trimmed}`;
      const project = await workspaceService.create(trimmed, finalPath);
      if (project) {
        await onCreate(project);
        onClose();
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cpd-overlay" onClick={onClose}>
      <div
        className="cpd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="cpd-header">
          <span className="cpd-title">{t("newProject") || (isRu ? "Новый проект" : "New Project")}</span>
          <button type="button" className="cpd-close" onClick={onClose} aria-label={t("close")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="cpd-form" onSubmit={handleSubmit}>
          <div className="cpd-field">
            <label className="cpd-label" htmlFor="cpd-proj-name">
              {t("projectName") || (isRu ? "Название проекта" : "Project Name")}
            </label>
            <input
              id="cpd-proj-name"
              ref={inputRef}
              type="text"
              className="cpd-input"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={isRu ? "Мой проект" : "My Project"}
              required
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="cpd-field">
            <label className="cpd-label" htmlFor="cpd-folder-path">
              {isRu ? "Расположение / Папка" : "Project Location / Folder"}
            </label>
            <div className="cpd-path-row">
              <input
                id="cpd-folder-path"
                type="text"
                className="cpd-input cpd-input--path"
                value={folderPath}
                onChange={(e) => {
                  setFolderPath(e.target.value);
                  setUserEditedPath(true);
                }}
                placeholder={isRu ? "Выберите папку..." : "Select folder..."}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="cpd-browse-btn"
                onClick={handlePickFolder}
                disabled={pickingFolder || submitting}
                title={isRu ? "Выбрать папку" : "Browse Folder"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>{isRu ? "Обзор" : "Browse"}</span>
              </button>
            </div>
          </div>

          <div className="cpd-actions">
            <button
              type="button"
              className="cpd-btn cpd-btn--cancel"
              onClick={onClose}
              disabled={submitting}
            >
              {t("cancel") || (isRu ? "Отмена" : "Cancel")}
            </button>
            <button
              type="submit"
              className="cpd-btn cpd-btn--create"
              disabled={submitting || !name.trim()}
            >
              {submitting ? (t("creating") || (isRu ? "Создание..." : "Creating...")) : (t("create") || (isRu ? "Создать" : "Create"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
