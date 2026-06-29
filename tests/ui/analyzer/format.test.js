/**
 * ui/analyzer/format.ts tests — mirrors tests/ui/converter/format.test.js's
 * structure for the Analyzer Screen's sibling formatting module.
 */
import { describe, it, expect } from "vitest";
import { formatStringList, formatTriState, formatScore, formatBadge } from "../../../ui/analyzer/format.js";

describe("formatStringList", () => {
  it("joins items with a comma", () => {
    expect(formatStringList(["sni", "alpn"])).toBe("sni, alpn");
  });

  it("returns 'none' for an empty list", () => {
    expect(formatStringList([])).toBe("none");
  });
});

describe("formatTriState", () => {
  it("formats true/false as Yes/No", () => {
    expect(formatTriState(true)).toBe("Yes");
    expect(formatTriState(false)).toBe("No");
  });

  it("formats null as N/A, never collapsing into 'No'", () => {
    expect(formatTriState(null)).toBe("N/A");
    expect(formatTriState(null)).not.toBe(formatTriState(false));
  });
});

describe("formatScore", () => {
  it("formats a 0-100 score with its scale", () => {
    expect(formatScore(87)).toBe("87/100");
    expect(formatScore(0)).toBe("0/100");
  });
});

describe("formatBadge", () => {
  it("formats true/false as ✅/❌", () => {
    expect(formatBadge(true)).toBe("✅");
    expect(formatBadge(false)).toBe("❌");
  });

  it("formats null as ❓, never collapsing into the ❌ glyph (Rule 9)", () => {
    expect(formatBadge(null)).toBe("❓");
    expect(formatBadge(null)).not.toBe(formatBadge(false));
  });
});
