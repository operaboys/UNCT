/**
 * Scroll-to-Top/Bottom FAB — one shared floating button covering all 8
 * Main Screens. Mounted once in `ui/main.tsx`'s shared shell, next to
 * `<AppNav>`, not duplicated per screen: `main.tsx` already renders every
 * screen inside one common `<div>` that owns the actual page scroll (no
 * screen has its own outer scroll container), so one instance here already
 * covers all of them, the same reasoning `ui/components/nav.tsx` documents
 * for its own single shared mount point.
 *
 * Fixed at the physical bottom-left corner in BOTH `dir="ltr"` and
 * `dir="rtl"` — deliberately `left`, not a logical `inset-inline-start`.
 * This button is a fixed screen anchor (like a native OS affordance), not
 * text-flow-relative chrome, so it should not mirror with reading
 * direction (RTL-GUIDELINES.md §4 only covers text-flow-relative
 * placement, not this case).
 */
import { useEffect, useState } from "preact/hooks";
import { createTranslator } from "../../core/i18n/translator.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";

// A page exactly the height of the viewport is not meaningfully
// scrollable -- this margin avoids the FAB flickering in/out at that
// razor's-edge boundary from sub-pixel layout rounding.
const SCROLLABLE_MARGIN_PX = 50;

function maxScrollTop() {
  return document.documentElement.scrollHeight - window.innerHeight;
}

function isPageScrollable() {
  return maxScrollTop() > SCROLLABLE_MARGIN_PX;
}

function isNearTop() {
  const max = maxScrollTop();
  return max <= 0 || window.scrollY < max / 2;
}

export function ScrollFab() {
  useSettingsState();
  const t = createTranslator(settingsStore);
  const [scrollable, setScrollable] = useState(false);
  const [nearTop, setNearTop] = useState(true);

  useEffect(() => {
    let ticking = false;
    function update() {
      setScrollable(isPageScrollable());
      setNearTop(isNearTop());
      ticking = false;
    }
    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    // A screen's content (e.g. a Parse/Analyze result populating tables)
    // can grow the page tall enough to become scrollable WITHOUT any
    // scroll or resize event ever firing -- a cheap poll is simpler and
    // more robust here than wiring a MutationObserver (or a bespoke
    // "content changed" signal) into all 8 screens individually.
    const interval = window.setInterval(update, 500);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      window.clearInterval(interval);
    };
  }, []);

  if (!scrollable) return null;

  function handleClick() {
    const top = nearTop ? document.documentElement.scrollHeight : 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      class="scroll-fab"
      aria-label={t(nearTop ? "common.scrollToBottom" : "common.scrollToTop")}
      onClick={handleClick}
    >
      {nearTop ? "↓" : "↑"}
    </button>
  );
}
