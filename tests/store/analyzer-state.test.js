/**
 * Analyzer State domain store (core/store/analyzer-state.js). Mirrors
 * tests/store/parser-state.test.js's structure for the sibling store.
 */
import { describe, it, expect, vi } from "vitest";
import { createAnalyzerStore } from "../../core/store/analyzer-state.js";

/**
 * @typedef {import("../../core/analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */

/**
 * @param {number} securityScore
 * @param {string[]} [issues]
 * @returns {AnalysisBundle}
 */
function bundle(securityScore, issues = []) {
  return {
    completeness: { missingFields: [], presentOptionalFields: [], completenessScore: 100 },
    protocol: { protocol: "vless", recognized: true },
    network: { network: "tcp", protocol: "vless", compatible: true, supportedNetworks: ["tcp"] },
    tls: { securityType: "none", applicable: false, coherent: true, knownFingerprint: null, issues: [] },
    reality: { applicable: false, compatible: true, pbkPlausible: null, sidPlausible: null, issues: [] },
    security: { securityScore, issues },
    compatibility: {
      platforms: { android: true, ios: true, windows: true, linux: true, macos: true },
      clients: { xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true },
    },
    cloudflare: { likelyCloudflareWorker: false, confidence: "low", signals: [] },
    cleanIp: { isCleanIpPattern: false, confidence: "low", signals: [] },
    worker: { applicable: false, workerDomain: null, pathSegments: [], uuidSegment: null, parameters: {}, encodedDataFindings: [] },
  };
}

describe("createAnalyzerStore", () => {
  it("starts with an empty analysis map", () => {
    const store = createAnalyzerStore();
    expect(store.getState()).toEqual({ analysisByNodeId: {} });
  });

  it("setAnalysisBatch keys verdicts by nodeId", () => {
    const store = createAnalyzerStore();

    store.setAnalysisBatch([
      { nodeId: "a", analysis: bundle(90) },
      { nodeId: "b", analysis: bundle(40) },
    ]);

    expect(store.getState().analysisByNodeId).toEqual({
      a: bundle(90),
      b: bundle(40),
    });
  });

  it("setAnalysisBatch merges into (rather than replaces) the existing map", () => {
    const store = createAnalyzerStore();
    store.setAnalysisBatch([{ nodeId: "a", analysis: bundle(90) }]);

    store.setAnalysisBatch([{ nodeId: "b", analysis: bundle(40) }]);

    expect(store.getState().analysisByNodeId).toEqual({
      a: bundle(90),
      b: bundle(40),
    });
  });

  it("a later batch overwrites a prior verdict for the same nodeId, by a new value", () => {
    const store = createAnalyzerStore();
    store.setAnalysisBatch([{ nodeId: "a", analysis: bundle(90) }]);

    store.setAnalysisBatch([{ nodeId: "a", analysis: bundle(10, ["weak"]) }]);

    expect(store.getState().analysisByNodeId.a).toEqual(bundle(10, ["weak"]));
  });

  it("clearAnalysis empties the map", () => {
    const store = createAnalyzerStore();
    store.setAnalysisBatch([{ nodeId: "a", analysis: bundle(90) }]);

    store.clearAnalysis();

    expect(store.getState()).toEqual({ analysisByNodeId: {} });
  });

  it("notifies subscribers on every mutation", () => {
    const store = createAnalyzerStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setAnalysisBatch([{ nodeId: "a", analysis: bundle(90) }]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ analysisByNodeId: { a: bundle(90) } });
  });
});
