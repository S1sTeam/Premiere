import { NumberInput, Select, Toggle } from "@zazaru/ui";
import { ControlRow } from "@zazaru/ui/recipes";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DownloadIcon, UploadStrokeIcon } from "@/base/browser/ui/icons/iconRegistry";
import type { AnimStyle, AnimationSettings } from "@/platform/configuration/browser/animationService";
import { useAnimations } from "@/platform/configuration/browser/animationService";
import { useI18n } from "@/platform/localization/localizationService";
import { CODE_FONT_OPTIONS, FONT_OPTIONS } from "@/platform/theme/fontService";
import { parseVSCodeTheme, type ThemeVars, themes } from "@/platform/theme/themeRegistry";
import { type ColorScheme, type ResolvedScheme, useTheme } from "@/platform/theme/themeService";
import { InlineAnimPreview } from "../../../browser/animationPreview";
import type { GeneralSettings, UpdateGeneral } from "../common/preferences";

const UI_FONT_OPTIONS = [
  { value: "Segoe UI", label: "Segoe UI", fontFamily: "Segoe UI" },
  { value: "System", label: "System" },
  ...FONT_OPTIONS,
];

const MONO_FONT_OPTIONS = [
  { value: "Cascadia Code", label: "Cascadia Code", fontFamily: "Cascadia Code" },
  { value: "Consolas", label: "Consolas", fontFamily: "Consolas" },
  { value: "monospace", label: "Monospace", fontFamily: "monospace" },
  ...CODE_FONT_OPTIONS,
];

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function shiftHex(hex: string, amount: number): string {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `#${channels
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel + amount)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function alphaHex(hex: string, alpha: number): string {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function rgba(hex: string, alpha: number): string {
  if (!isHexColor(hex)) return `rgba(128, 128, 128, ${alpha})`;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface HsvColor {
  h: number;
  s: number;
  v: number;
}

function hexToHsv(hex: string): HsvColor {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

function hsvToHex({ h, s, v }: HsvColor): string {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = value * saturation;
  const section = h / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const match = value - chroma;
  let rgb: [number, number, number];
  if (section < 1) rgb = [chroma, x, 0];
  else if (section < 2) rgb = [x, chroma, 0];
  else if (section < 3) rgb = [0, chroma, x];
  else if (section < 4) rgb = [0, x, chroma];
  else if (section < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return `#${rgb
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

const COLOR_PRESETS = ["#339CFF", "#7C6AF7", "#D05CE3", "#F05A7E", "#F97316", "#EAB308", "#22C55E", "#14B8A6"];

function ColorField({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  const normalized = isHexColor(value) ? value.toUpperCase() : "#808080";
  const [draft, setDraft] = useState(normalized);
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(normalized));
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const saturationRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(normalized);
    setHsv((current) => {
      const next = hexToHsv(normalized);
      return next.s === 0 ? { ...next, h: current.h } : next;
    });
  }, [normalized]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 260;
      const height = 350;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
      const top = rect.bottom + 8 + height > window.innerHeight ? Math.max(12, rect.top - height - 8) : rect.bottom + 8;
      setPosition({ top, left });
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const commit = () => {
    const next = draft.startsWith("#") ? draft : `#${draft}`;
    if (isHexColor(next)) onChange(next.toUpperCase());
    else setDraft(normalized);
  };

  const changeHsv = (next: HsvColor) => {
    const hex = hsvToHex(next);
    setHsv(next);
    setDraft(hex);
    onChange(hex);
  };

  const changeSaturation = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = saturationRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const v = Math.max(0, Math.min(100, 100 - ((event.clientY - rect.top) / rect.height) * 100));
    changeHsv({ ...hsv, s, v });
  };

  const changeHue = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = Math.max(0, Math.min(359.999, ((event.clientX - rect.left) / rect.width) * 360));
    changeHsv({ ...hsv, h });
  };

  return (
    <div className="settings__color-field">
      <button
        ref={triggerRef}
        className={`settings__color-trigger${open ? " settings__color-trigger--open" : ""}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="settings__color-trigger-swatch" style={{ background: normalized }} />
        <span>{normalized}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="settings__color-popover"
            role="dialog"
            aria-label={label}
            style={{ top: position.top, left: position.left }}
          >
            <div className="settings__color-popover-header">
              <span>{label}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              ref={saturationRef}
              className="settings__color-saturation"
              style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                changeSaturation(event);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) changeSaturation(event);
              }}
              aria-label={`${label}: saturation and brightness`}
            >
              <span
                className="settings__color-pointer"
                style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: normalized }}
              />
            </div>
            <div
              ref={hueRef}
              className="settings__color-hue"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                changeHue(event);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) changeHue(event);
              }}
              aria-label={`${label}: hue`}
            >
              <span
                className="settings__color-pointer settings__color-pointer--hue"
                style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }}
              />
            </div>
            <div className="settings__color-popover-input-row">
              <span className="settings__color-popover-preview" style={{ background: normalized }} />
              <label>
                <span>HEX</span>
                <input
                  value={draft}
                  maxLength={7}
                  spellCheck={false}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  aria-label={`${label} HEX`}
                />
              </label>
            </div>
            <div className="settings__color-presets" aria-label="Color presets">
              {COLOR_PRESETS.map((color) => (
                <button
                  type="button"
                  key={color}
                  style={{ background: color }}
                  onClick={() => {
                    setDraft(color);
                    onChange(color);
                  }}
                  aria-label={color}
                  aria-pressed={normalized === color}
                />
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function MiniApp({
  mode,
  vars,
  splitVars,
}: {
  mode: ColorScheme;
  vars: ThemeVars;
  splitVars?: ThemeVars;
}) {
  return (
    <div className={`settings__theme-mini settings__theme-mini--${mode}`}>
      {/* Top Window Bar */}
      <div className="settings__theme-mini-topbar">
        <div className="settings__theme-mini-dots">
          <span className="dot dot--red" />
          <span className="dot dot--yellow" />
          <span className="dot dot--green" />
        </div>
        <div className="settings__theme-mini-title">Premire</div>
      </div>
      {/* Window Body */}
      <div className="settings__theme-mini-window">
        {/* Left Sidebar */}
        <div className="settings__theme-mini-sidebar">
          <div className="mini-tree-item mini-tree-item--dir">src/</div>
          <div className="mini-tree-item mini-tree-item--file active">App.tsx</div>
          <div className="mini-tree-item mini-tree-item--file">style.css</div>
          <div className="mini-tree-item mini-tree-item--file">config.ts</div>
        </div>
        {/* Main Editor */}
        <div className="settings__theme-mini-main">
          {/* Mini tabs */}
          <div className="settings__theme-mini-tabbar">
            <span className="settings__theme-mini-tab active">App.tsx</span>
            <span className="settings__theme-mini-tab">main.css</span>
          </div>
          {/* Real Mini Code */}
          <div className="settings__theme-mini-code">
            <div className="mini-code-line">
              <span className="token-kw">import</span> <span className="token-fn">{"{ Agent }"}</span> <span className="token-kw">from</span> <span className="token-str">"premire"</span>;
            </div>
            <div className="mini-code-line">
              <span className="token-kw">export function</span> <span className="token-fn">App</span>() {"{"}
            </div>
            <div className="mini-code-line mini-code-line--in">
              <span className="token-kw">const</span> ai = <span className="token-fn">useAgent</span>();
            </div>
            <div className="mini-code-line mini-code-line--in">
              <span className="token-kw">return</span> &lt;<span className="token-fn">PremireStudio</span> /&gt;;
            </div>
            <div className="mini-code-line">{"}"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  active,
  label,
  lightVars,
  darkVars,
  onSelect,
}: {
  mode: ColorScheme;
  active: boolean;
  label: string;
  lightVars: ThemeVars;
  darkVars: ThemeVars;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`settings__theme-mode${active ? " settings__theme-mode--active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <MiniApp mode={mode} vars={mode === "light" ? lightVars : darkVars} splitVars={mode === "system" ? lightVars : undefined} />
      <div className="settings__theme-mode-label">
        <span className="mode-name">{label}</span>
        {active && <span className="mode-active-dot" />}
      </div>
    </button>
  );
}

function DiffPreview({ lightVars, darkVars }: { lightVars: ThemeVars; darkVars: ThemeVars }) {
  const { t } = useI18n();
  return (
    <div className="settings__diff-preview-wrapper">
      {/* Top IDE Window Header */}
      <div className="settings__diff-window-header">
        <div className="settings__diff-window-dots">
          <span className="dot dot--red" />
          <span className="dot dot--yellow" />
          <span className="dot dot--green" />
        </div>
        <div className="settings__diff-window-tab">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <span className="tab-name">AgentService.ts</span>
          <span className="diff-badge-diff">-3 / +4</span>
        </div>
        <div className="settings__diff-view-badge">Split Comparison View</div>
      </div>

      {/* Split Panes */}
      <div className="settings__diff-preview" aria-hidden="true">
        {/* Left pane: Deletion / Original */}
        <div className="settings__diff-pane settings__diff-pane--left">
          <div className="settings__diff-pane-bar">
            <span className="diff-pane-title">{t("diffOriginal")}</span>
            <span className="diff-tag diff-tag--del">{t("diffRemovedLines")}</span>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>1</em>
            <code>
              <span className="token-kw">import</span> {"{ legacyAgent }"} <span className="token-kw">from</span> <span className="token-str">"premire"</span>;
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>2</em>
            <code>
              <span className="token-kw">import type</span> {"{ Config }"} <span className="token-kw">from</span> <span className="token-str">"./types"</span>;
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>3</em>
            <code>
              <span className="token-kw">export class</span> <span className="token-fn">AgentService</span> {"{"}
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--deleted">
            <em>4</em>
            <code>
              <span className="diff-sign">-</span>  <span className="token-kw">private</span> engine = <span className="token-fn">legacyAgent</span>({"{"} <span className="token-prop">v</span>: <span className="token-num">1</span> {"}"});
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--deleted">
            <em>5</em>
            <code>
              <span className="diff-sign">-</span>  <span className="token-kw">public</span> <span className="token-fn">connect</span>() {"{"} <span className="token-kw">return</span> <span className="token-kw">this</span>.engine.<span className="token-fn">init</span>(); {"}"}
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--deleted">
            <em>6</em>
            <code>
              <span className="diff-sign">-</span>  <span className="token-kw">public</span> mode = <span className="token-str">"manual"</span>;
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>7</em>
            <code>
              {"}"}
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>8</em>
            <code>
              <span className="token-kw">export default new</span> <span className="token-fn">AgentService</span>();
            </code>
          </div>
        </div>

        {/* Right pane: Addition / New */}
        <div className="settings__diff-pane settings__diff-pane--right">
          <div className="settings__diff-pane-bar">
            <span className="diff-pane-title">{t("diffModified")}</span>
            <span className="diff-tag diff-tag--add">{t("diffAddedLines")}</span>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>1</em>
            <code>
              <span className="token-kw">import</span> {"{ createAgent }"} <span className="token-kw">from</span> <span className="token-str">"premire"</span>;
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>2</em>
            <code>
              <span className="token-kw">import type</span> {"{ Config }"} <span className="token-kw">from</span> <span className="token-str">"./types"</span>;
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>3</em>
            <code>
              <span className="token-kw">export class</span> <span className="token-fn">AgentService</span> {"{"}
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--added">
            <em>4</em>
            <code>
              <span className="diff-sign">+</span>  <span className="token-kw">private</span> agent = <span className="token-fn">createAgent</span>({"{"} <span className="token-prop">mode</span>: <span className="token-str">"autonomous"</span> {"}"});
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--added">
            <em>5</em>
            <code>
              <span className="diff-sign">+</span>  <span className="token-kw">public async</span> <span className="token-fn">connect</span>() {"{"}
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--added">
            <em>6</em>
            <code>
              <span className="diff-sign">+</span>    <span className="token-kw">await this</span>.agent.<span className="token-fn">launch</span>({"{"} <span className="token-prop">model</span>: <span className="token-str">"gemini-3.8"</span> {"}"});
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--added">
            <em>7</em>
            <code>
              <span className="diff-sign">+</span>  {"}"}
            </code>
          </div>
          <div className="settings__diff-line settings__diff-line--plain">
            <em>8</em>
            <code>
              <span className="token-kw">export default new</span> <span className="token-fn">AgentService</span>();
            </code>
          </div>
        </div>
      </div>
    </div>
  );
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

const ANIM_STYLE_OPTIONS = [
  { value: "fade", label: "Плавное появление (Fade)" },
  { value: "slide", label: "Скольжение (Slide)" },
  { value: "scale", label: "Масштабирование (Scale)" },
  { value: "fade-slide", label: "Появление со сдвигом (Fade-Slide)" },
  { value: "none", label: "Без анимации (None)" },
];

function getAnimStyleOptions(t: (key: string) => string) {
  return [
    { value: "fade", label: t("animFade") || "Fade" },
    { value: "slide", label: t("animSlide") || "Slide" },
    { value: "scale", label: t("animScale") || "Scale" },
    { value: "fade-slide", label: t("animFadeSlide") || "Fade-Slide" },
    { value: "none", label: t("animNone") || "None" },
  ];
}

function AnimationPlayground({ settings }: { settings: AnimationSettings }) {
  const { t } = useI18n();
  const animOptions = getAnimStyleOptions(t);
  const [activeTab, setActiveTab] = useState<"panel" | "sidebar" | "menu" | "buttons">("panel");
  const [animating, setAnimating] = useState(false);

  const runTest = (tab: "panel" | "sidebar" | "menu" | "buttons") => {
    setActiveTab(tab);
    setAnimating(false);
    setTimeout(() => setAnimating(true), 25);
  };

  const animClass = (style: AnimStyle) => {
    switch (style) {
      case "fade":
        return "apm-preview--fade";
      case "slide":
        return "apm-preview--slide";
      case "scale":
        return "apm-preview--scale";
      case "fade-slide":
        return "apm-preview--fade-slide";
      default:
        return "apm-preview--none";
    }
  };

  return (
    <div className="settings__anim-stage-card">
      <div className="settings__anim-stage-header">
        <div className="settings__anim-stage-dots">
          <span className="dot dot--red" />
          <span className="dot dot--yellow" />
          <span className="dot dot--green" />
        </div>
        <div className="settings__anim-stage-pills">
          <button
            type="button"
            className={`stage-pill${activeTab === "panel" ? " active" : ""}`}
            onClick={() => runTest("panel")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
            <span>{t("animPreviewWindow")}</span>
          </button>
          <button
            type="button"
            className={`stage-pill${activeTab === "sidebar" ? " active" : ""}`}
            onClick={() => runTest("sidebar")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span>{t("animPreviewSidebar")}</span>
          </button>
          <button
            type="button"
            className={`stage-pill${activeTab === "menu" ? " active" : ""}`}
            onClick={() => runTest("menu")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            <span>{t("animPreviewMenu")}</span>
          </button>
          <button
            type="button"
            className={`stage-pill${activeTab === "buttons" ? " active" : ""}`}
            onClick={() => runTest("buttons")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="6" width="16" height="12" rx="4" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
            <span>{t("animPreviewButtons")}</span>
          </button>
        </div>
        <button type="button" className="stage-test-trigger" onClick={() => runTest(activeTab)}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>{t("animPreviewPlay")}</span>
        </button>
      </div>

      <div className="settings__anim-stage-canvas">
        {activeTab === "panel" && (
          <div className={`apm-panel apm-panel--demo ${animating ? animClass(settings.panelAppear) : ""}`}>
            <div className="apm-panel__header">
              <div className="apm-panel__dots">
                <span className="dot dot--red" />
                <span className="dot dot--yellow" />
                <span className="dot dot--green" />
              </div>
              <div className="apm-panel__title">{t("animPreviewDialogTitle")}</div>
            </div>
            <div className="apm-panel__body">
              <div className="apm-dialog-msg">{t("animPreviewDialogMsg")}</div>
              <div className="apm-dialog-btns">
                <span className="apm-dialog-btn apm-dialog-btn--pri">{t("animPreviewSave")}</span>
                <span className="apm-dialog-btn">{t("animPreviewCancel")}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sidebar" && (
          <div className="apm-layout apm-layout--demo">
            <div className={`apm-sidebar ${animating ? animClass(settings.sidebarSlide) : ""}`}>
              <div className="apm-file-item apm-file-item--active">src/</div>
              <div className="apm-file-item">App.tsx</div>
              <div className="apm-file-item">style.css</div>
              <div className="apm-file-item">config.ts</div>
            </div>
            <div className="apm-main">
              <div className="apm-code-snippet">
                <div><span style={{ color: "#ffffff" }}>const</span> ide = <span style={{ color: "#38bdf8" }}>"Premire"</span>;</div>
                <div><span style={{ color: "#34d399" }}>console</span>.log(ide);</div>
                <div style={{ opacity: 0.5 }}>// split mode active</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "menu" && (
          <div className={`apm-ctx apm-ctx--demo ${animating ? animClass(settings.contextMenu) : ""}`}>
            <div className="apm-ctx__item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{t("animPreviewNewFile")}</span>
            </div>
            <div className="apm-ctx__item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>{t("animPreviewNewFolder")}</span>
            </div>
            <div className="apm-ctx__sep" />
            <div className="apm-ctx__item apm-ctx__item--danger">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>{t("animPreviewDelete")}</span>
            </div>
          </div>
        )}

        {activeTab === "buttons" && (
          <div className="apm-buttons apm-buttons--demo">
            <button
              type="button"
              className={`apm-btn ${animating ? animClass(settings.buttons) : ""}`}
            >
              Запустить задачу
            </button>
            <button
              type="button"
              className={`apm-btn apm-btn--outline ${animating ? animClass(settings.buttons) : ""}`}
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DesignTab({ general, updateGeneral }: { general: GeneralSettings; updateGeneral: UpdateGeneral }) {
  const { t } = useI18n();
  const {
    colorScheme,
    resolvedScheme,
    setColorScheme,
    setTheme,
    themeForScheme,
    themeVarsFor,
    updateThemeVars,
    resetThemeVars,
    hasThemeOverrides,
    installTheme,
  } = useTheme();
  const { settings, set, animMultiplier, setAnimMultiplier } = useAnimations();
  const animOptions = getAnimStyleOptions(t);
  const lightVars = themeVarsFor("light");
  const darkVars = themeVarsFor("dark");

  function importTheme(scheme: ResolvedScheme): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const customTheme = parseVSCodeTheme(JSON.parse(await file.text()));
        installTheme(customTheme);
        setTheme(customTheme.id, scheme);
      } catch (error) {
        console.error("Failed to parse theme", error);
      }
    };
    input.click();
  }

  function exportTheme(scheme: ResolvedScheme): void {
    const theme = themeForScheme(scheme);
    const effectiveTheme = {
      ...theme,
      darkVars: scheme === "dark" ? themeVarsFor("dark") : theme.darkVars,
      lightVars: scheme === "light" ? themeVarsFor("light") : theme.lightVars,
    };
    const anchor = document.createElement("a");
    anchor.setAttribute(
      "href",
      `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(effectiveTheme, null, 2))}`,
    );
    anchor.setAttribute("download", `${theme.name.toLowerCase().replace(/\s+/g, "-")}-${scheme}-theme.json`);
    anchor.click();
  }

  function updateBaseColor(scheme: ResolvedScheme, key: "accent" | "background" | "foreground", value: string) {
    if (key === "accent") {
      updateThemeVars(scheme, { "--accent": value, "--primary": value, "--toggle-checked": value });
      return;
    }
    if (key === "foreground") {
      updateThemeVars(scheme, {
        "--fg": value,
        "--fg-dim": alphaHex(value, 0.72),
        "--fg-muted": alphaHex(value, 0.52),
      });
      return;
    }
    const direction = scheme === "dark" ? 1 : -1;
    updateThemeVars(scheme, {
      "--bg": value,
      "--bg-2": shiftHex(value, direction * 5),
      "--bg-3": shiftHex(value, direction * 10),
      "--surface-underlay": shiftHex(value, -5),
      "--line": shiftHex(value, direction * 18),
      "--line-strong": shiftHex(value, direction * 30),
    });
  }

  const editor = (scheme: ResolvedScheme) => {
    const vars = scheme === "light" ? lightVars : darkVars;
    const theme = themeForScheme(scheme);
    return (
      <div
        className={`settings__appearance-card${scheme === resolvedScheme ? " settings__appearance-card--active" : ""}`}
        key={scheme}
      >
        <div className="settings__appearance-card-header">
          <strong>{scheme === "light" ? t("appearanceLightTheme") : t("appearanceDarkTheme")}</strong>
          <div className="settings__appearance-card-tools">
            {hasThemeOverrides(scheme) && (
              <button type="button" onClick={() => resetThemeVars(scheme)}>
                {t("restore")}
              </button>
            )}
            <button type="button" onClick={() => importTheme(scheme)}>
              <UploadStrokeIcon size={13} /> {t("importTheme")}
            </button>
            <button type="button" onClick={() => exportTheme(scheme)}>
              <DownloadIcon size={13} /> {t("exportTheme")}
            </button>
            <span className="settings__theme-glyph" aria-hidden="true">
              Aa
            </span>
            <Select
              className="settings__theme-select"
              value={theme.id}
              options={themes.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
              onChange={(value) => setTheme(value, scheme)}
            />
          </div>
        </div>
        <div className="settings__appearance-row">
          <span>{t("appearanceAccent")}</span>
          <ColorField
            value={vars["--accent"]}
            label={t("appearanceAccent")}
            onChange={(value) => updateBaseColor(scheme, "accent", value)}
          />
        </div>
        <div className="settings__appearance-row">
          <span>{t("backgroundColor")}</span>
          <ColorField
            value={vars["--bg"]}
            label={t("backgroundColor")}
            onChange={(value) => updateBaseColor(scheme, "background", value)}
          />
        </div>
        <div className="settings__appearance-row">
          <span>{t("appearanceForeground")}</span>
          <ColorField
            value={vars["--fg"]}
            label={t("appearanceForeground")}
            onChange={(value) => updateBaseColor(scheme, "foreground", value)}
          />
        </div>
        <div className="settings__appearance-row">
          <span>{t("font")}</span>
          <Select value={general.font} options={UI_FONT_OPTIONS} onChange={(value) => updateGeneral("font", value)} />
        </div>
        <div className="settings__appearance-row">
          <span>{t("codeFont")}</span>
          <Select
            value={general.codeFont}
            options={MONO_FONT_OPTIONS}
            onChange={(value) => updateGeneral("codeFont", value)}
          />
        </div>
      </div>
    );
  };

  const visibleSchemes: ResolvedScheme[] =
    colorScheme === "system" ? [resolvedScheme, resolvedScheme === "dark" ? "light" : "dark"] : [colorScheme];

  return (
    <div className="settings__appearance">
      {/* Block 1: Theme & Visual Tone */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 0 0 20" fill="currentColor" opacity="0.3" />
          </svg>
        }
        title={t("settingsBlockTheme")}
        subtitle={t("settingsBlockThemeDesc")}
      >
        <div className="settings__theme-modes">
          <ModeCard
            mode="system"
            active={colorScheme === "system"}
            label={t("system")}
            lightVars={lightVars}
            darkVars={darkVars}
            onSelect={() => setColorScheme("system")}
          />
          <ModeCard
            mode="light"
            active={colorScheme === "light"}
            label={t("light")}
            lightVars={lightVars}
            darkVars={darkVars}
            onSelect={() => setColorScheme("light")}
          />
          <ModeCard
            mode="dark"
            active={colorScheme === "dark"}
            label={t("dark")}
            lightVars={lightVars}
            darkVars={darkVars}
            onSelect={() => setColorScheme("dark")}
          />
        </div>
        <DiffPreview lightVars={lightVars} darkVars={darkVars} />
        <div className="settings__appearance-editors" key={colorScheme}>
          {visibleSchemes.map(editor)}
        </div>
      </SettingsCardBlock>

      {/* Block 2: Window Geometry & Layout */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        }
        title={t("settingsBlockPanels")}
        subtitle={t("settingsBlockPanelsDesc")}
      >
        <ControlRow label={t("borderRadius")} description={t("borderRadiusDesc")}>
          <NumberInput
            value={general.radius}
            step={1}
            min={0}
            max={general.experimentalExtremeRadius ? 100 : 16}
            onChange={(value) => updateGeneral("radius", value)}
          />
        </ControlRow>
        <ControlRow label={t("experimentalExtremeRadius")} description={t("experimentalExtremeRadiusDesc")}>
          <Toggle
            checked={general.experimentalExtremeRadius}
            onValueChange={(checked) => {
              updateGeneral("experimentalExtremeRadius", checked);
              if (!checked && (parseFloat(general.radius) || 0) > 16) updateGeneral("radius", "16");
            }}
          />
        </ControlRow>
        <ControlRow label={t("borderStyle")} description={t("borderStyleDesc")}>
          <Select
            value={general.borderStyle}
            options={[
              { value: "bordered", label: t("borderStyleBordered") },
              { value: "borderless", label: t("borderStyleBorderless") },
            ]}
            onChange={(value) => updateGeneral("borderStyle", value)}
          />
        </ControlRow>
        <ControlRow label={t("tabStyle")} description={t("tabStyleDesc")}>
          <Select
            value={general.tabStyle}
            options={[
              { value: "default", label: t("tabStyleDefault") },
              { value: "pills", label: t("tabStylePills") },
            ]}
            onChange={(value) => updateGeneral("tabStyle", value)}
          />
        </ControlRow>
        <ControlRow label={t("blurOverlay")} description={t("blurOverlayDesc")}>
          <Select
            value={general.blur}
            options={[
              { value: "none", label: t("blurNone") },
              { value: "subtle", label: t("blurSubtle") },
              { value: "strong", label: t("blurStrong") },
            ]}
            onChange={(value) => updateGeneral("blur", value)}
          />
        </ControlRow>
      </SettingsCardBlock>

      {/* Block 3: UI Zoom & Scaling */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        }
        title={t("settingsBlockScaling")}
        subtitle={t("settingsBlockScalingDesc")}
      >
        <ControlRow label={t("zoomStep")} description={t("zoomStepDesc")}>
          <NumberInput
            value={general.zoomStep}
            step={0.05}
            min={0.05}
            max={1}
            onChange={(value) => updateGeneral("zoomStep", value)}
          />
        </ControlRow>
        <ControlRow label={t("zoomDefault")} description={t("zoomDefaultDesc")}>
          <NumberInput
            value={general.zoomDefault}
            step={0.05}
            min={0.2}
            max={3}
            onChange={(value) => updateGeneral("zoomDefault", value)}
          />
        </ControlRow>
      </SettingsCardBlock>

      {/* Block 4: Motion & Animation */}
      <SettingsCardBlock
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
        title={t("settingsBlockAnimations")}
        subtitle={t("settingsBlockAnimationsDesc")}
      >
        <AnimationPlayground settings={settings} />

        <ControlRow label={t("animMultiplier")} description={t("animMultiplierDesc")}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="settings__anim-speed-pills">
              <button
                type="button"
                className={`speed-pill${animMultiplier === "0.5" ? " active" : ""}`}
                onClick={() => setAnimMultiplier("0.5")}
              >
                0.5x
              </button>
              <button
                type="button"
                className={`speed-pill${animMultiplier === "1" ? " active" : ""}`}
                onClick={() => setAnimMultiplier("1")}
              >
                1.0x
              </button>
              <button
                type="button"
                className={`speed-pill${animMultiplier === "1.5" ? " active" : ""}`}
                onClick={() => setAnimMultiplier("1.5")}
              >
                1.5x
              </button>
              <button
                type="button"
                className={`speed-pill${animMultiplier === "0" ? " active" : ""}`}
                onClick={() => setAnimMultiplier("0")}
              >
                Выкл
              </button>
            </div>
            <NumberInput value={animMultiplier} step={0.1} min={0} max={5} onChange={setAnimMultiplier} />
          </div>
        </ControlRow>

        <ControlRow label={t("animProjectSwitch")} description={t("animProjectSwitchDesc")}>
          <Select
            value={settings.projectSwitch}
            options={animOptions}
            onChange={(v) => set("projectSwitch", v as AnimStyle)}
          />
        </ControlRow>

        <ControlRow label={t("animSidebarSlide")} description={t("animSidebarSlideDesc")}>
          <Select
            value={settings.sidebarSlide}
            options={animOptions}
            onChange={(v) => set("sidebarSlide", v as AnimStyle)}
          />
        </ControlRow>

        <ControlRow label={t("animPanelAppear")} description={t("animPanelAppearDesc")}>
          <Select
            value={settings.panelAppear}
            options={animOptions}
            onChange={(v) => set("panelAppear", v as AnimStyle)}
          />
        </ControlRow>

        <ControlRow label={t("animContextMenu")} description={t("animContextMenuDesc")}>
          <Select
            value={settings.contextMenu}
            options={animOptions}
            onChange={(v) => set("contextMenu", v as AnimStyle)}
          />
        </ControlRow>

        <ControlRow label={t("animButtons")} description={t("animButtonsDesc")}>
          <Select
            value={settings.buttons}
            options={animOptions}
            onChange={(v) => set("buttons", v as AnimStyle)}
          />
        </ControlRow>

        <ControlRow label={t("animProjectHover")} description={t("animProjectHoverDesc")}>
          <Select
            value={settings.projectHover}
            options={animOptions}
            onChange={(v) => set("projectHover", v as AnimStyle)}
          />
        </ControlRow>
      </SettingsCardBlock>
    </div>
  );
}
