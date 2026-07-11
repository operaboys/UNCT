/**
 * Risk Score tests (06-ANALYZER_ENGINE §3.1, ADR-027).
 *
 * Covers:
 *  1. computeCompatibilityScore: all-true (100), all-false (0), all-null (50,
 *     the neutral midpoint), and a precise mixed case — computed from
 *     `clients` only, `platforms` never affects the result.
 *  2. computeRiskScore: the two extremes (0 and 100), a precise combined
 *     scenario with hand-verified arithmetic, and `dnsLeakRisk: "unknown"`
 *     landing on the same neutral midpoint (50) `null` uses in
 *     computeCompatibilityScore — one philosophy, applied twice.
 */
import { describe, it, expect } from "vitest";
import { computeCompatibilityScore, computeRiskScore } from "../../core/analyzer/risk-score.js";

/**
 * @param {Partial<Record<string, boolean | null>>} clients
 * @param {Partial<Record<string, boolean | null>>} [platforms]
 * @returns {import("../../core/analyzer/types").CompatibilityAnalysis}
 */
function compatibility(clients, platforms = {}) {
  return /** @type {any} */ ({ clients, platforms });
}

describe("computeCompatibilityScore", () => {
  it("scores 100 when every named client is compatible", () => {
    const c = compatibility({
      xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true,
    });
    expect(computeCompatibilityScore(c)).toBe(100);
  });

  it("scores 0 when every named client is incompatible", () => {
    const c = compatibility({
      xray: false, "sing-box": false, "clash-meta": false, nekobox: false, v2rayng: false, hiddify: false,
    });
    expect(computeCompatibilityScore(c)).toBe(0);
  });

  it("scores 50 (neutral midpoint) when every client verdict is unknown", () => {
    const c = compatibility({
      xray: null, "sing-box": null, "clash-meta": null, nekobox: null, v2rayng: null, hiddify: null,
    });
    expect(computeCompatibilityScore(c)).toBe(50);
  });

  it("computes a precise mixed case (3 true, 2 false, 1 null)", () => {
    const c = compatibility({
      xray: true, "sing-box": true, "clash-meta": true,
      nekobox: false, v2rayng: false,
      hiddify: null,
    });
    // (100+100+100+0+0+50) / 6 = 350/6 = 58.33... -> rounds to 58
    expect(computeCompatibilityScore(c)).toBe(58);
  });

  it("is computed from `clients` only — `platforms` never affects the result", () => {
    const clients = { xray: true, "sing-box": false, "clash-meta": null, nekobox: true, v2rayng: false, hiddify: null };
    const withNoPlatforms = compatibility(clients, {});
    const withAllPlatformsTrue = compatibility(clients, {
      android: true, ios: true, windows: true, linux: true, macos: true,
    });
    expect(computeCompatibilityScore(withNoPlatforms)).toBe(computeCompatibilityScore(withAllPlatformsTrue));
  });
});

describe("computeRiskScore — boundaries", () => {
  it("scores 0 (best case): perfect security, perfect compatibility, no DNS risk", () => {
    const riskScore = computeRiskScore({ securityScore: 100, compatibilityScore: 100, dnsLeakRisk: "none" });
    expect(riskScore).toBe(0);
  });

  it("scores 100 (worst case): zero security, zero compatibility, full DNS leak", () => {
    const riskScore = computeRiskScore({ securityScore: 0, compatibilityScore: 0, dnsLeakRisk: "high" });
    expect(riskScore).toBe(100);
  });
});

describe("computeRiskScore — precise combined scenario", () => {
  it("matches hand-verified arithmetic for a realistic mid-range node", () => {
    // securityScore=80 -> securityRisk=20; compatibilityScore=60 -> compatibilityRisk=40; dns="medium" -> dnsRisk=50
    // riskScore = round(0.5*20 + 0.2*40 + 0.3*50) = round(10 + 8 + 15) = 33
    const riskScore = computeRiskScore({ securityScore: 80, compatibilityScore: 60, dnsLeakRisk: "medium" });
    expect(riskScore).toBe(33);
  });

  it("weights security (50%) more heavily than compatibility (20%) for equal-magnitude changes", () => {
    const base = { securityScore: 100, compatibilityScore: 100, dnsLeakRisk: /** @type {const} */ ("none") };
    const worseSecurity = computeRiskScore({ ...base, securityScore: 80 });
    const worseCompatibility = computeRiskScore({ ...base, compatibilityScore: 80 });
    expect(worseSecurity).toBeGreaterThan(worseCompatibility);
  });
});

describe("computeRiskScore — `unknown` DNS risk uses the same neutral midpoint as `null` compatibility", () => {
  it("treats dnsLeakRisk:'unknown' identically to a hypothetical numeric 50", () => {
    const unknown = computeRiskScore({ securityScore: 90, compatibilityScore: 90, dnsLeakRisk: "unknown" });
    // Same formula, manually substituting dnsRisk=50 (medium's own value) to prove "unknown" === 50, not "medium"'s own bucket by coincidence.
    const asMedium = computeRiskScore({ securityScore: 90, compatibilityScore: 90, dnsLeakRisk: "medium" });
    expect(unknown).toBe(asMedium);
  });

  it("does not fabricate an optimistic ('none') or pessimistic ('high') verdict for 'unknown'", () => {
    const asUnknown = computeRiskScore({ securityScore: 90, compatibilityScore: 90, dnsLeakRisk: "unknown" });
    const asNone = computeRiskScore({ securityScore: 90, compatibilityScore: 90, dnsLeakRisk: "none" });
    const asHigh = computeRiskScore({ securityScore: 90, compatibilityScore: 90, dnsLeakRisk: "high" });
    expect(asUnknown).toBeGreaterThan(asNone);
    expect(asUnknown).toBeLessThan(asHigh);
  });
});
