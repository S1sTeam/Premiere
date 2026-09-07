import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimKey, AnimStyle } from "@/platform/configuration/browser/animationService";
import { useAnimations } from "@/platform/configuration/browser/animationService";
import "./animationPreview.css";

// ─── Duration map ────────────────────────────────────────────────────────────
const PREVIEW_DURATION: Record<AnimStyle, number> = {
  fade: 220,
  slide: 260,
  scale: 220,
  "fade-slide": 260,
  none: 80,
};

const ANIM_CLASS: Record<AnimStyle, string> = {
  fade: "apm-preview--fade",
  slide: "apm-preview--slide",
  scale: "apm-preview--scale",
  "fade-slide": "apm-preview--fade-slide",
  none: "apm-preview--none",
};

// ─── Mini workspace selector (horizontal) ───────────────────────────────────
const TILE_COLORS = ["#e2e8f0", "#f59e0b", "#10b981", "#38bdf8"];
const TILE_LABELS = ["A", "B", "C", "D"];

function MiniWorkspaceSelector({ highlightIdx }: { highlightIdx: number }) {
  return (
    <div className="apm-rail apm-rail--row">
      {TILE_LABELS.map((label, i) => (
        <div key={i} className={`apm-rail__tile${i === highlightIdx ? " apm-rail__tile--active" : ""}`}>
          <span
            className="apm-rail__avatar"
            style={{
              background: TILE_COLORS[i],
              boxShadow: i === highlightIdx ? `0 0 10px ${TILE_COLORS[i]}` : "none",
            }}
          >
            {label}
          </span>
        </div>
      ))}
      <div className="apm-rail__add">+</div>
    </div>
  );
}

// ─── Mini ContextMenu ────────────────────────────────────────────────────────
function MiniContextMenu({ cls, visible }: { cls: string; visible: boolean }) {
  return (
    <div className={`apm-ctx ${cls}`} style={{ opacity: visible ? undefined : 0 }} key={String(visible)}>
      <div className="apm-ctx__item">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>Новый файл</span>
      </div>
      <div className="apm-ctx__item">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>Новая папка</span>
      </div>
      <div className="apm-ctx__sep" />
      <div className="apm-ctx__item apm-ctx__item--danger">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span>Удалить</span>
      </div>
    </div>
  );
}

// ─── Mini Panel / Modal ──────────────────────────────────────────────────────
function MiniPanel({ cls, visible }: { cls: string; visible: boolean }) {
  return (
    <div className={`apm-panel ${cls}`} style={{ opacity: visible ? undefined : 0 }} key={String(visible)}>
      <div className="apm-panel__header">
        <div className="apm-panel__dots">
          <span className="dot dot--red" />
          <span className="dot dot--yellow" />
          <span className="dot dot--green" />
        </div>
        <div className="apm-panel__title">Диалог</div>
      </div>
      <div className="apm-panel__body">
        <div className="apm-panel__bar" />
        <div className="apm-panel__bar apm-panel__bar--short" />
        <div className="apm-panel__bar" />
      </div>
    </div>
  );
}

// ─── Mini Buttons ────────────────────────────────────────────────────────────
function MiniButtons({ cls, visible }: { cls: string; visible: boolean }) {
  return (
    <div className="apm-buttons" key={String(visible)}>
      <button className={`apm-btn${visible ? ` ${cls}` : ""}`} style={{ opacity: visible ? 1 : 0.3 }} tabIndex={-1}>
        Запустить
      </button>
      <button
        className={`apm-btn apm-btn--outline${visible ? ` ${cls}` : ""}`}
        style={{ animationDelay: "0.06s", opacity: visible ? 1 : 0.3 }}
        tabIndex={-1}
      >
        Отмена
      </button>
    </div>
  );
}

// ─── Mini Sidebar slide ──────────────────────────────────────────────────────
function MiniSidebarSlide({ cls, sidebarOpen }: { cls: string; sidebarOpen: boolean }) {
  return (
    <div className="apm-layout">
      <div
        className={`apm-sidebar${sidebarOpen ? ` apm-sidebar--open ${cls}` : " apm-sidebar--closed"}`}
        key={String(sidebarOpen)}
      >
        <span className="apm-sidebar__item apm-sidebar__item--active" />
        <span className="apm-sidebar__item" />
        <span className="apm-sidebar__item" />
        <span className="apm-sidebar__item" />
      </div>
      <div className="apm-main">
        <span className="apm-panel__bar" />
        <span className="apm-panel__bar apm-panel__bar--short" />
        <span className="apm-panel__bar" />
      </div>
    </div>
  );
}

// ─── Scene selector ──────────────────────────────────────────────────────────
function PreviewContent({
  animKey,
  animStyle,
  playing,
  tick,
}: {
  animKey: AnimKey;
  animStyle: AnimStyle;
  playing: boolean;
  tick: number;
}) {
  const cls = playing ? ANIM_CLASS[animStyle] : "";

  if (animKey === "projectHover") {
    return (
      <div className="apm-scene apm-scene--center">
        <MiniWorkspaceSelector highlightIdx={playing ? tick % TILE_LABELS.length : -1} />
      </div>
    );
  }
  if (animKey === "projectSwitch") {
    return (
      <div className="apm-scene apm-scene--full">
        <MiniPanel cls={cls} visible={playing} key={String(playing) + tick} />
      </div>
    );
  }
  if (animKey === "sidebarSlide") {
    return (
      <div className="apm-scene apm-scene--full">
        <MiniSidebarSlide cls={cls} sidebarOpen={playing} />
      </div>
    );
  }
  if (animKey === "contextMenu") {
    return (
      <div className="apm-scene apm-scene--center">
        <MiniContextMenu cls={cls} visible={playing} key={String(playing) + tick} />
      </div>
    );
  }
  if (animKey === "buttons") {
    return (
      <div className="apm-scene apm-scene--center">
        <MiniButtons cls={cls} visible={playing} key={String(playing) + tick} />
      </div>
    );
  }
  // panelAppear
  return (
    <div className="apm-scene apm-scene--center">
      <MiniPanel cls={cls} visible={playing} key={String(playing) + tick} />
    </div>
  );
}

// ─── Inline preview — hover-triggered, embedded in the settings card ─────────
export function InlineAnimPreview({ animKey, animStyle }: { animKey: AnimKey; animStyle: AnimStyle }) {
  const { animMultiplier } = useAnimations();
  const mult = Math.max(parseFloat(animMultiplier) || 1, 0.01);
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const cycleRef = useRef<ReturnType<typeof setInterval>>();

  const play = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlaying(false);
    timerRef.current = setTimeout(() => {
      setPlaying(true);
      setTick((n) => n + 1);
      const dur = (PREVIEW_DURATION[animStyle] + 150) * mult;
      timerRef.current = setTimeout(() => setPlaying(false), dur);
    }, 20 * mult);
  }, [animStyle, mult]);

  // Start cycle on hover, stop on leave
  useEffect(() => {
    if (hovered) {
      play();
      cycleRef.current = setInterval(() => play(), 1200 * mult);
    } else {
      if (cycleRef.current) clearInterval(cycleRef.current);
      // don't abort in-flight animation — let it finish naturally
    }
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [hovered, play, mult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, []);

  return (
    <div
      className={`apm-inline-stage${hovered ? " apm-inline-stage--active" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <PreviewContent animKey={animKey} animStyle={animStyle} playing={playing} tick={tick} />
    </div>
  );
}
