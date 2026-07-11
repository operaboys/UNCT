/**
 * Translation Completeness test (07-UI_UX_SYSTEM §9.9, ADR-019 Consequences):
 * every key in the English Dictionary must have a Persian counterpart — no
 * silent fallback. `fa.js` is deliberately NOT derived via `{ ...en }`
 * (see its header comment), so this test is the thing that actually keeps
 * the two dictionaries in sync as new keys are added.
 */
import { describe, it, expect } from "vitest";
import { en } from "../../core/i18n/dictionaries/en.js";
import { fa } from "../../core/i18n/dictionaries/fa.js";

describe("Translation Completeness (en.js vs fa.js)", () => {
  it("every English key has a Persian counterpart", () => {
    const missing = Object.keys(en).filter((key) => !(key in fa));
    expect(missing).toEqual([]);
  });

  it("every Persian key has an English counterpart (no orphaned/stale keys)", () => {
    const orphaned = Object.keys(fa).filter((key) => !(key in en));
    expect(orphaned).toEqual([]);
  });

  it("no value is an empty string in either dictionary", () => {
    const emptyInEn = Object.entries(en).filter(([, value]) => value === "");
    const emptyInFa = Object.entries(fa).filter(([, value]) => value === "");
    expect(emptyInEn).toEqual([]);
    expect(emptyInFa).toEqual([]);
  });
});
