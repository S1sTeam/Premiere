import { NumberInput, Select, Toggle } from "@zazaru/ui";
import { ControlRow } from "@zazaru/ui/recipes";
import type React from "react";
import { useI18n } from "@/platform/localization/localizationService";
import type { GeneralSettings, UpdateGeneral } from "../common/preferences";

function SettingsCardBlock({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings__card-block">
      <div className="settings__card-block-header">
        <div className="settings__card-block-icon-wrap">{icon}</div>
        <div className="settings__card-block-text">
          <h4 className="settings__card-block-title">{title}</h4>
          {subtitle && <p className="settings__card-block-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="settings__card-block-body">{children}</div>
    </div>
  );
}

export function CodeTab({ general, updateGeneral }: { general: GeneralSettings; updateGeneral: UpdateGeneral }) {
  const { t } = useI18n();

  return (
    <div className="settings__code-tab">
      {/* Block 1: Typography & Text */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        }
        title={t("settingsBlockTypography")}
        subtitle={t("settingsBlockTypographyDesc")}
      >
        <ControlRow label={t("editorFontSize")} description={t("editorFontSizeDesc")}>
          <NumberInput
            value={general.editorFontSize}
            step={1}
            min={8}
            max={32}
            onChange={(v) => updateGeneral("editorFontSize", v)}
          />
        </ControlRow>
        <ControlRow label={t("editorLineHeight")} description={t("editorLineHeightDesc")}>
          <NumberInput
            value={general.editorLineHeight}
            step={0.1}
            min={1}
            max={3}
            onChange={(v) => updateGeneral("editorLineHeight", v)}
          />
        </ControlRow>
        <ControlRow label={t("editorLigatures")} description={t("editorLigaturesDesc")}>
          <Toggle
            checked={general.editorLigatures}
            onValueChange={(checked) => updateGeneral("editorLigatures", checked)}
          />
        </ControlRow>
      </SettingsCardBlock>

      {/* Block 2: Cursor & Focus */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="22" strokeWidth="3" />
          </svg>
        }
        title={t("settingsBlockCursor")}
        subtitle={t("settingsBlockCursorDesc")}
      >
        <ControlRow label={t("editorCursorStyle")} description={t("editorCursorStyleDesc")}>
          <Select
            value={general.editorCursorStyle}
            options={[
              { value: "line", label: t("cursorLine") },
              { value: "block", label: t("cursorBlock") },
              { value: "underline", label: t("cursorUnderline") },
              { value: "line-thin", label: t("cursorLineThin") },
              { value: "block-outline", label: t("cursorBlockOutline") },
              { value: "underline-thin", label: t("cursorUnderlineThin") },
            ]}
            onChange={(v) => updateGeneral("editorCursorStyle", v)}
          />
        </ControlRow>
        <ControlRow label={t("editorCursorBlink")} description={t("editorCursorBlinkDesc")}>
          <Select
            value={general.editorCursorBlink}
            options={[
              { value: "blink", label: t("blinkBlink") },
              { value: "smooth", label: t("blinkSmooth") },
              { value: "phase", label: t("blinkPhase") },
              { value: "expand", label: t("blinkExpand") },
              { value: "solid", label: t("blinkSolid") },
            ]}
            onChange={(v) => updateGeneral("editorCursorBlink", v)}
          />
        </ControlRow>
      </SettingsCardBlock>
    </div>
  );
}
