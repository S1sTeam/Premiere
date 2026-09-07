import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { ShortcutCategory, ShortcutDef } from "@/platform/keybinding/browser/useKeybindings";
import { useI18n } from "@/platform/localization/localizationService";
import { getHotkeysLocale } from "./hotkeysLocalization";

const CATEGORY_ORDER: ShortcutCategory[] = [
  "navigation",
  "search",
  "chat",
  "workspace",
  "terminal",
  "project",
  "editor",
];

const CATEGORY_ICONS: Record<ShortcutCategory, React.ReactNode> = {
  navigation: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  chat: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  workspace: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  terminal: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  project: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  editor: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

function renderKbdKeys(keysStr: string, unassignedText: string, chordThenText: string) {
  if (!keysStr) return <span className="hotkey-unbound">{unassignedText}</span>;

  const sequences = keysStr.split(" ");
  return (
    <div className="hotkey-kbd-sequence">
      {sequences.map((seq, sIdx) => {
        const parts = seq.split("+");
        return (
          <span key={sIdx} className="hotkey-kbd-chord">
            {parts.map((part, pIdx) => (
              <span key={pIdx} className="hotkey-kbd-item">
                <kbd className="hotkey-kbd">{part.trim()}</kbd>
                {pIdx < parts.length - 1 && <span className="hotkey-plus">+</span>}
              </span>
            ))}
            {sIdx < sequences.length - 1 && <span className="hotkey-chord-space">{chordThenText}</span>}
          </span>
        );
      })}
    </div>
  );
}

interface Props {
  shortcuts?: ShortcutDef[];
  recordingId: string | null;
  setRecordingId: Dispatch<SetStateAction<string | null>>;
  errorMsg: string | null;
  setErrorMsg: Dispatch<SetStateAction<string | null>>;
  onResetBinding?: (id: string) => Promise<void>;
}

export function HotkeysTab({
  shortcuts,
  recordingId,
  setRecordingId,
  errorMsg,
  setErrorMsg,
  onResetBinding,
}: Props) {
  const { lang } = useI18n();
  const i18n = useMemo(() => getHotkeysLocale(lang), [lang]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredShortcuts = useMemo(() => {
    const list = shortcuts ?? [];
    return list.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const localizedLabel = i18n.commands[item.id] || item.label;
      const localizedCategory = i18n.categories[item.category]?.title || item.category;

      return (
        localizedLabel.toLowerCase().includes(normalizedQuery) ||
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.keys.toLowerCase().includes(normalizedQuery) ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        localizedCategory.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [shortcuts, activeCategory, normalizedQuery, i18n]);

  const grouped = useMemo(() => {
    const map: Partial<Record<ShortcutCategory, ShortcutDef[]>> = {};
    for (const item of filteredShortcuts) {
      map[item.category] = [...(map[item.category] ?? []), item];
    }
    return map;
  }, [filteredShortcuts]);

  const totalCount = shortcuts?.length ?? 0;
  const isFiltered = Boolean(searchQuery) || activeCategory !== "all";

  return (
    <div className="settings__section settings__hotkeys-container">
      {/* Top Search & Filter Bar */}
      <div className="settings__hotkeys-toolbar">
        {/* Row 1: Search Input & Stats Bar */}
        <div className="settings__hotkeys-search-row">
          <div className="settings__hotkeys-search-wrapper">
            <svg
              className="settings__hotkeys-search-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="settings__hotkeys-search-input"
              placeholder={i18n.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="settings__hotkeys-search-clear"
                onClick={() => setSearchQuery("")}
                title={i18n.resetFilters}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="settings__hotkeys-stats">
            <span className="settings__hotkeys-stats-badge">
              {i18n.statsText(filteredShortcuts.length, totalCount)}
            </span>
            {isFiltered && (
              <button
                type="button"
                className="settings__hotkeys-reset-filter-btn"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
              >
                {i18n.resetFilters}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Dedicated Segmented Category Filters Bar */}
        <div className="settings__hotkeys-filter-bar">
          <div className="settings__hotkeys-pills">
            <button
              type="button"
              className={`settings__hotkey-pill${activeCategory === "all" ? " active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              <span>{i18n.all}</span>
              <span className="pill-badge">{totalCount}</span>
            </button>
            {CATEGORY_ORDER.map((cat) => {
              const count = (shortcuts ?? []).filter((s) => s.category === cat).length;
              if (count === 0) return null;
              const meta = i18n.categories[cat];
              const icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  className={`settings__hotkey-pill${activeCategory === cat ? " active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {icon}
                  <span>{meta.short}</span>
                  <span className="pill-badge">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="settings__hotkeys-error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="error-close-btn">
            ✕
          </button>
        </div>
      )}

      {/* Shortcuts List */}
      {filteredShortcuts.length === 0 ? (
        <div className="settings__hotkeys-empty-card">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h4>{i18n.emptyTitle}</h4>
          <p>{i18n.emptyDesc}</p>
          {isFiltered && (
            <button
              type="button"
              className="settings__hotkeys-clear-filter-btn"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
            >
              {i18n.resetFilters}
            </button>
          )}
        </div>
      ) : (
        <div className="settings__hotkeys-sections-wrap">
          {CATEGORY_ORDER.map((category) => {
            const items = grouped[category];
            if (!items || items.length === 0) return null;
            const meta = i18n.categories[category];
            const icon = CATEGORY_ICONS[category];

            return (
              <div key={category} className="settings__card-block settings__hotkeys-block">
                <div className="settings__card-header settings__hotkeys-header">
                  <div className="settings__card-icon">{icon}</div>
                  <div className="settings__card-header-text">
                    <h3>{meta.title}</h3>
                    <p>{i18n.commandsConfigured(items.length)}</p>
                  </div>
                </div>

                <div className="settings__card-body settings__hotkeys-table">
                  {items.map((shortcut) => {
                    const isRecording = recordingId === shortcut.id;
                    const commandName = i18n.commands[shortcut.id] || shortcut.label;

                    return (
                      <div
                        key={shortcut.id}
                        className={`settings__hotkey-row${isRecording ? " recording-row" : ""}`}
                        onClick={() => {
                          if (isRecording) {
                            setRecordingId(null);
                          } else {
                            setRecordingId(shortcut.id);
                            setErrorMsg(null);
                          }
                        }}
                      >
                        {/* Left: Command Info */}
                        <div className="settings__hotkey-info">
                          <div className="settings__hotkey-label">{commandName}</div>
                          <div className="settings__hotkey-meta">
                            <span className="settings__hotkey-id">{shortcut.id}</span>
                          </div>
                        </div>

                        {/* Right: Key Badge & Reset */}
                        <div className="settings__hotkey-controls" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`settings__hotkey-btn${isRecording ? " recording" : ""}`}
                            onClick={() => {
                              if (isRecording) {
                                setRecordingId(null);
                              } else {
                                setRecordingId(shortcut.id);
                                setErrorMsg(null);
                              }
                            }}
                            title={isRecording ? i18n.cancelEsc : i18n.rebindTooltip}
                          >
                            {isRecording ? (
                              <span className="settings__hotkey-recording-pulse">
                                <span className="pulse-dot" />
                                {i18n.pressCombo}
                              </span>
                            ) : (
                              renderKbdKeys(shortcut.keys, i18n.unassigned, i18n.chordThen)
                            )}
                          </button>

                          {onResetBinding && (
                            <button
                              type="button"
                              className="settings__hotkey-reset-btn"
                              title={i18n.resetTooltip}
                              onClick={(e) => {
                                e.stopPropagation();
                                void onResetBinding(shortcut.id);
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Instructions */}
      <div className="settings__hotkeys-footer-tip">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>{i18n.footerTip}</span>
      </div>
    </div>
  );
}
