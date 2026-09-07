import { interactiveItemClassName, interactiveListClassName } from "@zazaru/ui";
import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./slashPopup.css";

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/fix",
    label: "Fix",
    description: "Diagnose and fix bugs, errors, or compiler diagnostics",
    icon: "🔧",
  },
  {
    command: "/explain",
    label: "Explain",
    description: "Explain code architecture, logic, or complexity",
    icon: "💡",
  },
  {
    command: "/test",
    label: "Test",
    description: "Generate unit tests and test cases",
    icon: "🧪",
  },
  {
    command: "/refactor",
    label: "Refactor",
    description: "Clean up code structure, readability, and performance",
    icon: "⚡",
  },
  {
    command: "/doc",
    label: "Document",
    description: "Generate documentation, docstrings, and JSDoc comments",
    icon: "📝",
  },
];

interface SlashPopupProps {
  active: boolean;
  query: string;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
}

export function SlashPopup({ active, query, onSelect, onClose }: SlashPopupProps): React.ReactElement | null {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});

  const filtered = SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(query.toLowerCase()) ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useLayoutEffect(() => {
    if (!active) return;
    const el = popupRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const updatePosition = () => {
      const parentRect = parent.getBoundingClientRect();
      const titlebarEl = document.querySelector(".titlebar");
      const titlebarBottom = titlebarEl ? titlebarEl.getBoundingClientRect().bottom : 38;
      const safeTopMargin = titlebarBottom + 12;
      const spaceAbove = parentRect.top - safeTopMargin - 8;
      const spaceBelow = window.innerHeight - parentRect.bottom - 16 - 8;

      if (spaceAbove < 140 && spaceBelow > spaceAbove) {
        setPositionStyle({
          bottom: "auto",
          top: "calc(100% + 8px)",
          maxHeight: `${Math.max(80, Math.min(320, spaceBelow))}px`,
        });
      } else {
        setPositionStyle({
          bottom: "calc(100% + 8px)",
          top: "auto",
          maxHeight: `${Math.max(80, Math.min(320, spaceAbove))}px`,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (filtered.length > 0 ? (i + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (filtered.length > 0 ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered.length > 0 && filtered[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(filtered[selectedIndex]!);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [active, filtered, selectedIndex, onSelect, onClose]);

  if (!active || filtered.length === 0) return null;

  return (
    <div
      ref={popupRef}
      className={interactiveListClassName("slash-popup")}
      style={positionStyle}
      role="menu"
      aria-label="Slash commands"
    >
      <div className="slash-popup__header">Quick Commands</div>
      {filtered.map((item, idx) => (
        <button
          key={item.command}
          type="button"
          className={interactiveItemClassName(
            idx === selectedIndex,
            `slash-popup__item${idx === selectedIndex ? " slash-popup__item--active" : ""}`,
          )}
          onMouseEnter={() => setSelectedIndex(idx)}
          onClick={() => onSelect(item)}
        >
          <span className="slash-popup__icon">{item.icon}</span>
          <span className="slash-popup__command">{item.command}</span>
          <span className="slash-popup__desc">{item.description}</span>
        </button>
      ))}
    </div>
  );
}
