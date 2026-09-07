import { interactiveItemClassName, interactiveListClassName, surfaceClassName } from "@zazaru/ui";
import type React from "react";
import { useMemo, useState } from "react";
import { useI18n } from "@/platform/localization/localizationService";
import type { SettingsTab } from "../common/preferences";

interface Props {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  onClose: () => void;
}

export function SettingsSidebar({ activeTab, onSelect, onClose }: Props): React.ReactElement {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const groups = useMemo(
    () => [
      {
        label: t("app"),
        items: [
          ["general", t("general")],
          ["design", t("design")],
          ["code", t("codeTab")],
          ["hotkeys", t("hotkeys")],
        ] as [SettingsTab, string][],
      },
      {
        label: t("server"),
        items: [
          ["providers", t("providers")],
          ["models", t("models")],
          ["mcp", t("mcpServers")],
        ] as [SettingsTab, string][],
      },
    ],
    [t],
  );
  const item = (id: SettingsTab, label: string) => (
    <button
      key={id}
      className={interactiveItemClassName(
        activeTab === id,
        `settings__sidebar-item ${activeTab === id ? "active" : ""}`,
      )}
      onClick={() => onSelect(id)}
    >
      <span className="settings__sidebar-item-indicator" aria-hidden="true" />
      <span className="settings__sidebar-item-label">{label}</span>
    </button>
  );
  return (
    <div className={surfaceClassName("transparent", "settings__sidebar")}>
      <div className="settings__sidebar-header">
        <button className="settings__back" type="button" onClick={onClose} aria-label={t("close")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span>{t("settings")}</span>
      </div>
      <label className="settings__sidebar-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} />
      </label>
      <div className="settings__sidebar-nav">
        {groups.map((group) => {
          const visibleItems = group.items.filter(([, label]) => label.toLocaleLowerCase().includes(normalizedQuery));
          if (visibleItems.length === 0) return null;
          return (
            <div className={interactiveListClassName("settings__sidebar-group")} key={group.label}>
              <div className="settings__sidebar-title">{group.label}</div>
              {visibleItems.map(([id, label]) => item(id, label))}
            </div>
          );
        })}
      </div>
      <div className="settings__sidebar-footer">
        <div className="settings__app-info">
          {t("appName")}
          <span>{t("appVersion")}</span>
        </div>
      </div>
    </div>
  );
}
