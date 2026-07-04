/**
 * ui/analyzer/format.ts tests — mirrors tests/ui/converter/format.test.js's
 * structure for the Analyzer Screen's sibling formatting module.
 */
import { describe, it, expect } from "vitest";
import { formatStringList, formatTriState, formatScore, formatBadge, dnsRiskTagClass } from "../../../ui/analyzer/format.js";

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

describe("dnsRiskTagClass", () => {
  it("maps each concrete DnsLeakRisk level to a distinct tag class", () => {
    expect(dnsRiskTagClass("none")).toBe("tag--valid");
    expect(dnsRiskTagClass("low")).toBe("tag--warning");
    expect(dnsRiskTagClass("medium")).toBe("tag--invalid");
    expect(dnsRiskTagClass("high")).toBe("tag--critical");
  });

  it("maps 'unknown' to the neutral info class, never a risk-severity color (Rule 9)", () => {
    expect(dnsRiskTagClass("unknown")).toBe("tag--info");
  });

  it("falls back to the neutral info class for any unrecognized value", () => {
    expect(dnsRiskTagClass("not-a-real-risk-level")).toBe("tag--info");
  });
});
