/**
 * Pure content model for the in-app User Guide (Settings screen) and the
 * root `USER_GUIDE.md` export — both consume this one array (plus the i18n
 * dictionaries for the actual text) so a 9th screen added later can't update
 * one copy and silently leave the other stale. Order matches
 * `ui/components/nav.tsx`'s `NAV_ITEMS` (a test asserts this).
 *
 * `screenshot` is a filename only, not a full path — the actual `src` is
 * built as `assets/guide/<en|fa>/<screenshot>` at render/build time, since
 * the same screen has one real screenshot per UI language (living-docs:
 * these PNGs are static and only regenerated manually via
 * `scripts/capture-guide-screenshots.mjs`, one known/accepted limitation).
 */
export interface GuideScreenEntry {
  key: string;
  titleKey: string;
  descKey: string;
  whenKey: string;
  screenshot: string;
}

export const GUIDE_SCREENS: readonly GuideScreenEntry[] = [
  { key: "dashboard", titleKey: "userGuide.screens.dashboard.title", descKey: "userGuide.screens.dashboard.desc", whenKey: "userGuide.screens.dashboard.when", screenshot: "dashboard.png" },
  { key: "converter", titleKey: "userGuide.screens.converter.title", descKey: "userGuide.screens.converter.desc", whenKey: "userGuide.screens.converter.when", screenshot: "converter.png" },
  { key: "analyzer", titleKey: "userGuide.screens.analyzer.title", descKey: "userGuide.screens.analyzer.desc", whenKey: "userGuide.screens.analyzer.when", screenshot: "analyzer.png" },
  { key: "subscription", titleKey: "userGuide.screens.subscription.title", descKey: "userGuide.screens.subscription.desc", whenKey: "userGuide.screens.subscription.when", screenshot: "subscription.png" },
  { key: "extractor", titleKey: "userGuide.screens.extractor.title", descKey: "userGuide.screens.extractor.desc", whenKey: "userGuide.screens.extractor.when", screenshot: "extractor.png" },
  { key: "export", titleKey: "userGuide.screens.export.title", descKey: "userGuide.screens.export.desc", whenKey: "userGuide.screens.export.when", screenshot: "export.png" },
  { key: "settings", titleKey: "userGuide.screens.settings.title", descKey: "userGuide.screens.settings.desc", whenKey: "userGuide.screens.settings.when", screenshot: "settings.png" },
  { key: "devconsole", titleKey: "userGuide.screens.devconsole.title", descKey: "userGuide.screens.devconsole.desc", whenKey: "userGuide.screens.devconsole.when", screenshot: "devconsole.png" },
];

/** @param {"en" | "fa"} language @param {string} screenshot */
export function guideScreenshotSrc(language: "en" | "fa", screenshot: string): string {
  return `assets/guide/${language === "fa" ? "fa" : "en"}/${screenshot}`;
}
