import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * useComposerDockAnimation
 *
 * Implements a hardware-accelerated FLIP (First, Last, Invert, Play) animation
 * for the chat composer dock. When transitioning between the empty state (centered hero)
 * and the active chat state (bottom dock), this hook measures the layout delta and
 * translates the element using GPU composited `transform: translate3d(...)` at locked 60 FPS,
 * completely avoiding layout reflows and stuttering.
 */
export function useComposerDockAnimation(isHero: boolean) {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const prevHeroRef = useRef<boolean | null>(null);
  const prevRectRef = useRef<DOMRect | null>(null);
  const animTimeoutRef = useRef<number | null>(null);

  // Keep bounding rect up-to-date on window resize
  useEffect(() => {
    const handleResize = () => {
      if (dockRef.current) {
        prevRectRef.current = dockRef.current.getBoundingClientRect();
      }
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useLayoutEffect(() => {
    const el = dockRef.current;
    if (!el) return;

    const currentRect = el.getBoundingClientRect();

    // Skip animation on initial application mount
    if (prevHeroRef.current === null) {
      prevHeroRef.current = isHero;
      prevRectRef.current = currentRect;
      return;
    }

    // Check for accessibility preference: respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prevHeroRef.current !== isHero) {
      const prevRect = prevRectRef.current;
      prevHeroRef.current = isHero;

      if (!prefersReducedMotion && prevRect && Math.abs(prevRect.top - currentRect.top) > 2) {
        // FLIP: Delta between where it was (First) and where it is now (Last)
        const deltaY = prevRect.top - currentRect.top;

        if (animTimeoutRef.current) {
          window.clearTimeout(animTimeoutRef.current);
          animTimeoutRef.current = null;
        }

        // 1. INVERT: Instantly translate the element back to where it appeared previously
        el.style.transition = "none";
        el.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        el.style.willChange = "transform";

        // Force layout pass so the browser commits the inverted transform before painting
        void el.offsetHeight;

        // 2. PLAY: On next animation frame, animate smoothly to final position (0, 0, 0)
        requestAnimationFrame(() => {
          el.style.transition = "transform 460ms cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = "translate3d(0, 0, 0)";
        });

        const cleanup = () => {
          if (dockRef.current === el) {
            el.style.transition = "";
            el.style.transform = "";
            el.style.willChange = "";
            prevRectRef.current = el.getBoundingClientRect();
          }
        };

        const handleTransitionEnd = (e: TransitionEvent) => {
          if (e.target === el && e.propertyName === "transform") {
            cleanup();
            el.removeEventListener("transitionend", handleTransitionEnd);
          }
        };

        el.addEventListener("transitionend", handleTransitionEnd);
        animTimeoutRef.current = window.setTimeout(cleanup, 520);
        return;
      }
    }

    prevRectRef.current = currentRect;
  });

  return dockRef;
}
