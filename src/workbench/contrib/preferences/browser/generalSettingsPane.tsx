import { Button, Select, Toggle } from "@zazaru/ui";
import { ControlRow } from "@zazaru/ui/recipes";
import type React from "react";
import { languageOptions } from "@/platform/localization/localizationCatalog";
import { useI18n } from "@/platform/localization/localizationService";
import type { GeneralSettings, UpdateGeneral } from "../common/preferences";

interface Props {
  general: GeneralSettings;
  updateGeneral: UpdateGeneral;
  onClose: () => void;
}

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

export function GeneralTab({ general, updateGeneral, onClose }: Props): React.ReactElement {
  const { t } = useI18n();

  const toggle = (key: keyof GeneralSettings, label: string, description: string) => (
    <ControlRow label={t(label)} description={t(description)}>
      <Toggle checked={general[key] as boolean} onValueChange={(checked) => updateGeneral(key, checked)} />
    </ControlRow>
  );

  return (
    <div className="settings__general-tab">
      {/* Block 1: Environment & System */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        }
        title={t("settingsBlockEnv")}
        subtitle={t("settingsBlockEnvDesc")}
      >
        <ControlRow label={t("language")} description={t("languageDesc")}>
          <Select
            value={general.language}
            options={languageOptions.map((option) => {
              const label = String(t(`lang${option.value}`) || option.value);
              return { value: option.value, label: label.charAt(0).toUpperCase() + label.slice(1) };
            })}
            onChange={(value) => updateGeneral("language", value)}
          />
        </ControlRow>
        <ControlRow label={t("terminalShell")} description={t("terminalShellDesc")}>
          <Select
            value={general.terminalShell}
            options={[
              { value: "powershell", label: "PowerShell" },
              { value: "cmd", label: "CMD" },
              { value: "bash", label: "Bash" },
            ]}
            onChange={(value) => updateGeneral("terminalShell", value)}
          />
        </ControlRow>
        {toggle("useRegionalProxy", "useRegionalProxy", "useRegionalProxyDesc")}
      </SettingsCardBlock>

      {/* Block 2: AI Autonomy & Reasoning */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8" y2="16" />
            <line x1="16" y1="16" x2="16" y2="16" />
          </svg>
        }
        title={t("settingsBlockAi")}
        subtitle={t("settingsBlockAiDesc")}
      >
        {toggle("autoAccept", "autoAccept", "autoAcceptDesc")}
        {toggle("showThinking", "showThinking", "showThinkingDesc")}
      </SettingsCardBlock>

      {/* Block 3: Workspace & Chat Interface */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        }
        title={t("settingsBlockChat")}
        subtitle={t("settingsBlockChatDesc")}
      >
        {toggle("renderFileTree", "renderFileTree", "renderFileTreeDesc")}
        {toggle("promptMarkdown", "promptMarkdown", "promptMarkdownDesc")}
        {toggle("promptMarkdownGhost", "promptMarkdownGhost", "promptMarkdownGhostDesc")}
      </SettingsCardBlock>

      {/* Block 4: Sound Notifications */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        }
        title={t("soundNotifications")}
        subtitle={t("settingsBlockSoundDesc")}
      >
        {toggle("soundEnabled", "soundEnabled", "soundEnabledDesc")}
        {toggle("soundOnComplete", "soundOnComplete", "soundOnCompleteDesc")}
        {toggle("soundOnStop", "soundOnStop", "soundOnStopDesc")}
      </SettingsCardBlock>

      {/* Block 5: System Onboarding */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        }
        title={t("settingsBlockOnboarding")}
        subtitle={t("settingsBlockOnboardingDesc")}
      >
        <ControlRow label={t("rerunOnboarding")} description={t("rerunOnboardingDesc")}>
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("vibe:open-welcome-screen"));
            }}
          >
            {t("rerunOnboarding")}
          </Button>
        </ControlRow>
      </SettingsCardBlock>
    </div>
  );
}
