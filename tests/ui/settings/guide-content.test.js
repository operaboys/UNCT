/**
 * ui/settings/guide-content.ts tests — pins the one invariant that matters
 * for the User Guide's per-screen content: its screen order/keys must track
 * `ui/components/nav.tsx`'s `NAV_ITEMS` exactly (keys hardcoded here rather
 * than imported from `nav.tsx`, since importing that component triggers its
 * module-level `settingsStore`/`matchMedia` singleton wiring — this test
 * only needs the plain key list, not the component itself), so a 9th screen
 * added later can't update the nav and silently leave the Guide (or vice
 * versa) stale. Also confirms every referenced i18n key exists in both
 * dictionaries and `guideScreenshotSrc` builds the expected per-language path.
 */
import { describe, it, expect } from "vitest";
import { GUIDE_SCREENS, guideScreenshotSrc } from "../../../ui/settings/guide-content.js";
import { en } from "../../../core/i18n/dictionaries/en.js";
import { fa } from "../../../core/i18n/dictionaries/fa.js";

/** Mirrors `ui/components/nav.tsx`'s `NAV_ITEMS` key order exactly. */
const NAV_ITEM_KEYS = ["dashboard", "converter", "analyzer", "subscription", "extractor", "export", "settings", "devconsole"];

describe("GUIDE_SCREENS", () => {
  it("has exactly 8 entries", () => {
    expect(GUIDE_SCREENS).toHaveLength(8);
  });

  it("matches nav.tsx's NAV_ITEMS keys and order exactly", () => {
    expect(GUIDE_SCREENS.map((s) => s.key)).toEqual(NAV_ITEM_KEYS);
  });

  it("every titleKey/descKey/whenKey resolves in both dictionaries", () => {
    /** @type {Record<string, string>} */
    const enDict = en;
    /** @type {Record<string, string>} */
    const faDict = fa;
    for (const screen of GUIDE_SCREENS) {
      for (const k of [screen.titleKey, screen.descKey, screen.whenKey]) {
        expect(enDict[k], `en missing ${k}`).toBeTruthy();
        expect(faDict[k], `fa missing ${k}`).toBeTruthy();
      }
    }
  });

  it("every screenshot filename is unique and ends with .png", () => {
    const shots = GUIDE_SCREENS.map((s) => s.screenshot);
    expect(new Set(shots).size).toBe(shots.length);
    for (const shot of shots) expect(shot).toMatch(/\.png$/);
  });
});

describe("guideScreenshotSrc", () => {
  it("builds an English path by default for any non-fa language", () => {
    expect(guideScreenshotSrc("en", "dashboard.png")).toBe("assets/guide/en/dashboard.png");
  });

  it("builds a Persian path for fa", () => {
    expect(guideScreenshotSrc("fa", "dashboard.png")).toBe("assets/guide/fa/dashboard.png");
  });
});
