import type React from "react";
import { useEffect } from "react";
import { preloadAll } from "../../../base/browser/preloader";
import "./loadingView.css";

export function Loading(): React.ReactElement {
  useEffect(() => {
    preloadAll();
  }, []);

  return (
    <div className="premire-splash" role="status" aria-label="Loading Premire">
      <div className="premire-splash__content">
        <div className="premire-splash__card">
          <div className="premire-splash__emblem-container">
            <div className="premire-splash__ambient-glow" />
            <div className="premire-splash__emblem-box">
              <svg width="38" height="38" viewBox="0 0 40 40" fill="none" className="premire-splash__emblem-svg">
                <defs>
                  <linearGradient id="p-stem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#CBD5E1" />
                  </linearGradient>
                  <linearGradient id="p-loop" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#64748B" />
                  </linearGradient>
                  <linearGradient id="p-core" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#CBD5E1" />
                  </linearGradient>
                </defs>
                <rect x="7" y="6" width="7" height="28" rx="3.5" fill="url(#p-stem)" />
                <path d="M17 6H26C31.5228 6 36 10.4772 36 16C36 21.5228 31.5228 26 26 26H17V6Z" fill="url(#p-loop)" opacity="0.95" />
                <rect x="17" y="12" width="8" height="8" rx="4" fill="#08090D" />
                <circle cx="21" cy="16" r="2" fill="url(#p-core)" />
              </svg>
            </div>
          </div>

          <div className="premire-splash__brand-header">
            <span className="premire-splash__title">Premire</span>
          </div>

          <div className="premire-splash__meter-wrap">
            <div className="premire-splash__meter-track">
              <div className="premire-splash__meter-beam" />
            </div>

            <div className="premire-splash__status-row">
              <span className="premire-splash__status-dot" />
              <span className="premire-splash__status-text">Loading workspace...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

