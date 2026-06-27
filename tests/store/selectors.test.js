/**
 * Selectors over ParserState (core/store/selectors.js, ADR-015) — the
 * Rule 11 boundary: sorting/filtering on values Validation/Analyzer already
 * computed is allowed here; computing a NEW score is not (and none of these
 * selectors do).
 */
import { describe, it, expect } from "vitest";
import { createNode, withValidation } from "../../core/unm/create-node.js";
import {
  selectAllNodes,
  selectNodeById,
  selectValidNodeIds,
  selectNodesSortedBySecurity,
  selectProtocolCounts,
  selectAggregatedWarnings,
  selectAggregatedErrors,
  selectAggregatedRecoveryActions,
  selectAnalysisByNodeId,
} from "../../core/store/selectors.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    ...overrides,
  }));
}

/**
 * Build a type-correct AnalysisObject fixture (06-ANALYZER_ENGINE / spec 05).
 * @param {number} securityScore
 */
function analysisWithScore(securityScore) {
  return {
    riskScore: 0,
    securityScore,
    compatibilityScore: 0,
    cloudflareDetected: false,
    realityDetected: false,
    workerDetected: false,
    cleanIPDetected: false,
    dnsLeakRisk: "none",
  };
}

describe("selectAllNodes / selectNodeById", () => {
  it("returns the full collection and looks up by nodeId", () => {
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });
    const state = { nodes: [a, b] };

    expect(selectAllNodes(state)).toEqual([a, b]);
    expect(selectNodeById(state, b.nodeId)).toBe(b);
    expect(selectNodeById(state, "not-a-real-id")).toBeUndefined();
  });
});

describe("selectValidNodeIds", () => {
  it("keeps only nodes whose Validation Engine result is overallValid", () => {
    const base = node();
    const valid = withValidation(base, { ...base.validation, overallValid: true });
    const invalid = node(); // emptyValidation() -> overallValid: false
    const state = { nodes: [valid, invalid] };

    expect(selectValidNodeIds(state)).toEqual([valid.nodeId]);
  });
});

describe("selectNodesSortedBySecurity", () => {
  it("sorts by analysis.securityScore, highest first", () => {
    const low = node({ analysis: analysisWithScore(20) });
    const high = node({ analysis: analysisWithScore(90) });
    const mid = node({ analysis: analysisWithScore(50) });
    const state = { nodes: [low, high, mid] };

    expect(selectNodesSortedBySecurity(state).map((n) => n.nodeId))
      .toEqual([high.nodeId, mid.nodeId, low.nodeId]);
  });

  it("sorts unscored nodes (no analysis yet) last, not first", () => {
    const scored = node({ analysis: analysisWithScore(10) });
    const unscored = node();
    const state = { nodes: [unscored, scored] };

    expect(selectNodesSortedBySecurity(state).map((n) => n.nodeId))
      .toEqual([scored.nodeId, unscored.nodeId]);
  });

  it("does not mutate the original nodes array", () => {
    const a = node({ analysis: analysisWithScore(10) });
    const b = node({ analysis: analysisWithScore(90) });
    const nodes = [a, b];
    const state = { nodes };

    selectNodesSortedBySecurity(state);

    expect(state.nodes).toBe(nodes);
    expect(state.nodes).toEqual([a, b]);
  });
});

describe("selectProtocolCounts", () => {
  it("tallies nodes by protocol (Converter Screen Parser Preview, doc 07 §4.2)", () => {
    const state = {
      nodes: [
        node({ protocol: "vless" }),
        node({ protocol: "vless" }),
        node({ protocol: "trojan" }),
      ],
    };

    expect(selectProtocolCounts(state)).toEqual({ vless: 2, trojan: 1 });
  });

  it("returns an empty object for an empty collection", () => {
    expect(selectProtocolCounts({ nodes: [] })).toEqual({});
  });
});

describe("selectAggregatedWarnings / selectAggregatedErrors / selectAggregatedRecoveryActions", () => {
  it("flattens metadata arrays across every node, in node order", () => {
    const a = node({ metadata: { warnings: ["w1"], errors: ["e1"], recoveryActions: ["r1"] } });
    const b = node({ metadata: { warnings: ["w2", "w3"], errors: [], recoveryActions: ["r2"] } });
    const state = { nodes: [a, b] };

    expect(selectAggregatedWarnings(state)).toEqual(["w1", "w2", "w3"]);
    expect(selectAggregatedErrors(state)).toEqual(["e1"]);
    expect(selectAggregatedRecoveryActions(state)).toEqual(["r1", "r2"]);
  });

  it("returns empty arrays when no node has any diagnostics", () => {
    const state = { nodes: [node(), node()] };

    expect(selectAggregatedWarnings(state)).toEqual([]);
    expect(selectAggregatedErrors(state)).toEqual([]);
    expect(selectAggregatedRecoveryActions(state)).toEqual([]);
  });
});

describe("selectAnalysisByNodeId", () => {
  it("looks up a node's Analyzer verdict bundle from AnalyzerState by nodeId", () => {
    /** @type {import("../../core/analyzer/analyze-node.js").AnalysisBundle} */
    const analysis = {
      completeness: { missingFields: [], presentOptionalFields: [], completenessScore: 100 },
      protocol: { protocol: "vless", recognized: true },
      network: { network: "tcp", protocol: "vless", compatible: true, supportedNetworks: ["tcp"] },
      tls: { securityType: "none", applicable: false, coherent: true, knownFingerprint: null, issues: [] },
      reality: { applicable: false, compatible: true, pbkPlausible: null, sidPlausible: null, issues: [] },
      security: { securityScore: 87, issues: [] },
    };
    const state = { analysisByNodeId: { a: analysis } };

    expect(selectAnalysisByNodeId(state, "a")).toBe(analysis);
    expect(selectAnalysisByNodeId(state, "not-a-real-id")).toBeUndefined();
  });
});
