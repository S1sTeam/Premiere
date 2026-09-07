import { Button, Input, Select } from "@zazaru/ui";
import React, { Component, type ReactNode, useEffect, useState } from "react";
import { languageOptions } from "@/platform/localization/localizationCatalog";
import { useI18n } from "@/platform/localization/localizationService";
import { useTheme } from "@/platform/theme/themeService";
import { windowApi } from "@/platform/native/tauri/windowService";
import { appState } from "@/platform/storage/common/keyValueStore";
import { aiProviderService } from "@/workbench/services/aiProviders/tauri/aiProviderService";
import type { OnboardingViewProps } from "../common/welcome";
import "./onboardingView.css";

interface ErrorBoundaryProps {
  onComplete: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WelcomeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("OnboardingView error caught by ErrorBoundary:", error);
    this.props.onComplete();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const DEFAULT_MODELS = [
  { value: "sonnet-5", label: "Claude Sonnet 5" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "deepseek-r1", label: "DeepSeek R1" },
  { value: "gpt-4o", label: "GPT-4o" },
];

function OnboardingViewContent({ onComplete, onLanguageChange }: OnboardingViewProps): React.ReactElement {
  const { lang } = useI18n();
  const { colorScheme, setColorScheme } = useTheme();

  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("sonnet-5");

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    windowApi.maximize().catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  const handleFinish = async () => {
    setIsClosing(true);
    try {
      await appState.set("onboarding:completed", "true");
    } catch {}

    try {
      localStorage.setItem("premire_kv:onboarding:completed", "true");
      localStorage.setItem("onboarding:completed", "true");
    } catch {}

    try {
      await aiProviderService.setProvider(
        apiKey.trim(),
        "https://free.sysik.mom/v1",
        selectedModel,
        "premire",
      );
      await aiProviderService.saveProvider({
        id: "premire",
        name: "Premire AI",
        baseUrl: "https://free.sysik.mom/v1",
        apiKey: apiKey.trim(),
        model: selectedModel,
        addedAt: Date.now(),
      });
    } catch (err) {
      console.warn("Failed to save initial provider config:", err);
    }

    windowApi.setFullscreen(true).catch(() => {});
    setTimeout(() => {
      onComplete();
    }, 280);
  };

  const handleDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    void windowApi.startDragging().catch(() => {});
  };

  const isRu = lang === "Russian";

  return (
    <div
      className={`premire-onboarding ${visible ? "premire-onboarding--visible" : ""} ${
        isClosing ? "premire-onboarding--closing" : ""
      }`}
    >
      <div className="premire-onboarding__drag" onMouseDown={handleDrag} />

      <div className="premire-onboarding__card">
        {/* Brand Header */}
        <div className="premire-onboarding__brand">
          <div className="premire-onboarding__logo" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
              <rect x="10" y="8" width="12" height="32" rx="6" fill="#f8fafc" />
              <rect x="26" y="8" width="12" height="18" rx="6" fill="#94a3b8" />
            </svg>
          </div>
          <h1 className="premire-onboarding__title">Premire</h1>
          <p className="premire-onboarding__tagline">
            {isRu ? "Минималистичная AI-среда разработки" : "Minimalist AI Code Studio"}
          </p>
        </div>

        {/* Minimal Setup Form */}
        <div className="premire-onboarding__body">
          {/* Row 1: Language & Theme */}
          <div className="premire-onboarding__grid">
            <div className="premire-onboarding__field">
              <label className="premire-onboarding__label">
                {isRu ? "Язык интерфейса" : "Interface Language"}
              </label>
              <Select
                options={languageOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.value,
                }))}
                value={lang || "English"}
                onChange={(newLang) => {
                  onLanguageChange(newLang);
                  void appState.set("settings:language", newLang);
                }}
              />
            </div>

            <div className="premire-onboarding__field">
              <label className="premire-onboarding__label">
                {isRu ? "Цветовая схема" : "Color Theme"}
              </label>
              <div className="premire-onboarding__theme-pills">
                <button
                  type="button"
                  className={`premire-onboarding__pill ${
                    colorScheme === "dark" ? "premire-onboarding__pill--active" : ""
                  }`}
                  onClick={() => setColorScheme("dark")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>{isRu ? "Тёмная" : "Dark"}</span>
                </button>
                <button
                  type="button"
                  className={`premire-onboarding__pill ${
                    colorScheme === "light" ? "premire-onboarding__pill--active" : ""
                  }`}
                  onClick={() => setColorScheme("light")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                  </svg>
                  <span>{isRu ? "Светлая" : "Light"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: AI Engine */}
          <div className="premire-onboarding__section">
            <div className="premire-onboarding__section-header">
              <span className="premire-onboarding__section-title">
                {isRu ? "Подключение к Premire AI" : "Premire AI Engine"}
              </span>
              <span className="premire-onboarding__section-badge">free.sysik.mom</span>
            </div>

            <div className="premire-onboarding__grid">
              <div className="premire-onboarding__field">
                <label className="premire-onboarding__label">
                  {isRu ? "API Ключ (по желанию)" : "API Key (optional)"}
                </label>
                <Input
                  type="password"
                  placeholder={isRu ? "Введите ваш API ключ..." : "Enter your API key..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div className="premire-onboarding__field">
                <label className="premire-onboarding__label">
                  {isRu ? "Основная модель" : "Default Model"}
                </label>
                <Select
                  options={DEFAULT_MODELS}
                  value={selectedModel}
                  onChange={(m) => setSelectedModel(m)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="premire-onboarding__footer">
          <Button variant="ghost" onClick={handleFinish} className="premire-onboarding__skip-btn">
            {isRu ? "Пропустить" : "Skip"}
          </Button>
          <Button variant="primary" onClick={handleFinish} className="premire-onboarding__start-btn">
            {isRu ? "Приступить к работе" : "Start Coding"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingView(props: OnboardingViewProps): React.ReactElement {
  return (
    <WelcomeErrorBoundary onComplete={props.onComplete}>
      <OnboardingViewContent {...props} />
    </WelcomeErrorBoundary>
  );
}
