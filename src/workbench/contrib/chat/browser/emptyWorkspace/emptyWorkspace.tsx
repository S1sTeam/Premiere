import type React from "react";
import { CodeIcon, LightbulbIcon, RefreshCwStrokeIcon, SearchStrokeIcon } from "@/base/browser/ui/icons/iconRegistry";
import { useI18n } from "@/platform/localization/localizationService";
import "./emptyWorkspace.css";
import type { EmptyWorkspaceViewProps } from "../../common/chat";

export function EmptyWorkspaceHeader({ projectName }: { projectName?: string }): React.ReactElement {
  const { t } = useI18n();
  return (
    <div className="empty-workspace__hero" aria-label={t("emptyWorkspaceTitle", { project: projectName ?? "" })}>
      <div className="empty-workspace__brand-icon-wrap">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="empty-workspace__brand-svg">
          <rect x="8" y="8" width="14" height="32" rx="7" className="empty-workspace__brand-rect-1" fill="#f8fafc" />
          <rect x="26" y="8" width="14" height="19" rx="7" className="empty-workspace__brand-rect-2" fill="#94a3b8" />
        </svg>
      </div>
      <h1 className="empty-workspace__title">{t("emptyWorkspaceTitle", { project: projectName ?? "" })}</h1>
    </div>
  );
}

export function EmptyWorkspaceSuggestions(_props: { onSelectPrompt: (prompt: string) => void }): React.ReactElement | null {
  return null;
}

export function EmptyWorkspaceView({
  projectName,
  onSelectPrompt,
  section = "all",
}: EmptyWorkspaceViewProps): React.ReactElement | null {
  if (section === "suggestions") {
    return null;
  }

  return <EmptyWorkspaceHeader projectName={projectName} />;
}
