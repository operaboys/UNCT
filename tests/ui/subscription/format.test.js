/**
 * ui/subscription/format.ts tests — mirrors tests/ui/analyzer/format.test.js's
 * structure for the Subscription Center Screen's sibling formatting module
 * (Orphan Check item #2: wiring up the previously never-called
 * `selectNodesSortedBySecurity`).
 */
import { describe, it, expect } from "vitest";
import { createNode } from "../../../core/unm/create-node.js";
import { sortNodesBySecurityScore, formatNodeSecurityScore } from "../../../ui/subscription/format.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    ...overrides,
  }));
}

/**
 * @typedef {import("../../../core/analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */

/**
 * Build a type-correct AnalysisBundle fixture (06-ANALYZER_ENGINE), mirroring
 * tests/store/selectors.test.js's identical helper.
 * @param {number} securityScore
 * @returns {AnalysisBundle}
 */
function bundle(securityScore) {
  return {
    completeness: { missingFields: [], presentOptionalFields: [], completenessScore: 100 },
    protocol: { protocol: "vless", recognized: true },
    network: { network: "tcp", protocol: "vless", compatible: true, supportedNetworks: ["tcp"] },
    tls: { securityType: "none", applicable: false, coherent: true, knownFingerprint: null, issues: [] },
    reality: { applicable: false, compatible: true, pbkPlausible: null, sidPlausible: null, issues: [] },
    security: { securityScore, issues: [] },
  };
}

describe("sortNodesBySecurityScore", () => {
  it("sorts nodes highest security score first, using the real AnalyzerState bundle", () => {
    const low = node();
    const high = node();
    const analysisByNodeId = { [low.nodeId]: bundle(20), [high.nodeId]: bundle(90) };

    const sorted = sortNodesBySecurityScore([low, high], analysisByNodeId);

    expect(sorted.map((n) => n.nodeId)).toEqual([high.nodeId, low.nodeId]);
  });

  it("sorts nodes the Analyzer has not scored yet last, never fabricating a score (Rule 9)", () => {
    const scored = node();
    const unscored = node();
    const analysisByNodeId = { [scored.nodeId]: bundle(50) };

    const sorted = sortNodesBySecurityScore([unscored, scored], analysisByNodeId);

    expect(sorted.map((n) => n.nodeId)).toEqual([scored.nodeId, unscored.nodeId]);
  });

  it("returns an empty array for an empty node list", () => {
    expect(sortNodesBySecurityScore([], {})).toEqual([]);
  });
});

describe("formatNodeSecurityScore", () => {
  it("formats a scored node's real security score", () => {
    const n = node();
    const analysisByNodeId = { [n.nodeId]: bundle(73) };

    expect(formatNodeSecurityScore(analysisByNodeId, n.nodeId)).toBe("73/100");
  });

  it("returns 'N/A' for a node the Analyzer has not scored yet, never a fabricated 0 (Rule 9)", () => {
    const n = node();

    expect(formatNodeSecurityScore({}, n.nodeId)).toBe("N/A");
  });
});
