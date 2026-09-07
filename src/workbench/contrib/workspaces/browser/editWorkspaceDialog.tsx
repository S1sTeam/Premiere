import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/platform/localization/localizationService";
import { workspaceService } from "@/workbench/services/workspace/tauri/workspaceService";
import type { EditWorkspaceDialogProps } from "../common/workspaces";
import "./editWorkspaceDialog.css";

export function EditWorkspaceDialog({ project, onSave, onClose }: EditWorkspaceDialogProps): React.ReactElement {
  const { t } = useI18n();
  const [name, setName] = useState(project.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(project.name);
    setSaving(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [project]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await workspaceService.rename(project.id, trimmed);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("premire:project-renamed", {
            detail: { id: project.id, name: trimmed },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("vibe:workspace:renamed", {
            detail: { id: project.id, name: trimmed },
          }),
        );
      }
      onSave();
    } catch (err) {
      console.error("Failed to rename project:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rpd-overlay" onClick={onClose}>
      <div
        className="rpd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rpd-header">
          <span className="rpd-title">{t("renameProject")}</span>
          <button type="button" className="rpd-close" onClick={onClose} aria-label={t("close")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="rpd-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="rpd-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("projectName")}
            required
            autoComplete="off"
            spellCheck={false}
          />

          <div className="rpd-actions">
            <button
              type="button"
              className="rpd-btn rpd-btn--cancel"
              onClick={onClose}
              disabled={saving}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="rpd-btn rpd-btn--save"
              disabled={saving || !name.trim() || name.trim() === project.name}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
