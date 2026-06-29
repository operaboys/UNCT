/**
 * Subscription Analyzer tests (06-ANALYZER_ENGINE §2.5, Phase 10).
 *
 * Covers:
 *  1. Total Nodes + Protocol Distribution on a small mixed-protocol set.
 *  2. Duplicate Nodes: a deliberate protocol+address+port+uuid collision is
 *     grouped, while same address+port but a DIFFERENT uuid is NOT flagged
 *     (proves the key is the full tuple, not just address+port).
 *  3. Invalid Nodes: read verbatim from `validation.overallValid`, never
 *     re-judged by this module.
 *  4. Dead Nodes Candidate: always `null`, regardless of input (Rule 9) —
 *     the task's own explicit "must stay null, never guessed" requirement.
 *  5. Security Ranking: omits nodes absent from `analysisByNodeId` entirely
 *     (never defaulted to 0), sorts the rest highest-score-first.
 */
import { describe, it, expect } from "vitest";
import { analyzeSubscription } from "../../core/analyzer/extended/subscription-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", validation: { overallValid: true }, ...overrides,
  }));
}

describe("analyzeSubscription — Total Nodes + Protocol Distribution", () => {
  it("counts the collection and tallies protocols", () => {
    const nodes = [
      node({ protocol: "vless" }),
      node({ protocol: "vmess", sourceType: "vmess-url" }),
      node({ protocol: "vless", address: "two.example.com" }),
    ];
    const summary = analyzeSubscription(nodes);
    expect(summary.totalNodes).toBe(3);
    expect(summary.protocolDistribution).toEqual({ vless: 2, vmess: 1 });
  });
});

describe("analyzeSubscription — Duplicate Nodes", () => {
  it("groups nodes sharing protocol+address+port+uuid, ignoring remark", () => {
    const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const a = node({ uuid, remark: "copy-1" });
    const b = node({ uuid, remark: "copy-2" });
    const summary = analyzeSubscription([a, b]);
    expect(summary.duplicateGroups).toHaveLength(1);
    expect(summary.duplicateGroups[0].nodeIds.sort()).toEqual([a.nodeId, b.nodeId].sort());
    expect(summary.duplicateNodeCount).toBe(2);
  });

  it("does NOT flag same address+port with a different credential as duplicate", () => {
    const a = node({ uuid: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" });
    const b = node({ uuid: "11111111-2222-3333-4444-555555555555" });
    const summary = analyzeSubscription([a, b]);
    expect(summary.duplicateGroups).toHaveLength(0);
    expect(summary.duplicateNodeCount).toBe(0);
  });
});

describe("analyzeSubscription — Invalid Nodes", () => {
  it("lists nodeIds with overallValid === false, reusing the existing flag verbatim", () => {
    const valid = node({ validation: { overallValid: true } });
    const invalid = node({ address: "bad host", validation: { overallValid: false } });
    const summary = analyzeSubscription([valid, invalid]);
    expect(summary.invalidNodeIds).toEqual([invalid.nodeId]);
  });
});

describe("analyzeSubscription — Dead Nodes Candidate", () => {
  it("is always null, never a guessed value (Rule 9)", () => {
    const summary = analyzeSubscription([node(), node(), node()]);
    expect(summary.deadNodesCandidate).toBeNull();
  });

  it("stays null even for an empty node collection", () => {
    const summary = analyzeSubscription([]);
    expect(summary.deadNodesCandidate).toBeNull();
    expect(summary.totalNodes).toBe(0);
  });
});

describe("analyzeSubscription — Security Ranking", () => {
  it("omits un-Analyzed nodes entirely and sorts the rest highest-first", () => {
    const scored1 = node();
    const scored2 = node();
    const unscored = node();
    const analysisByNodeId = /** @type {any} */ ({
      [scored1.nodeId]: { security: { securityScore: 40 } },
      [scored2.nodeId]: { security: { securityScore: 90 } },
    });
    const summary = analyzeSubscription([scored1, scored2, unscored], analysisByNodeId);
    expect(summary.securityRanking).toEqual([
      { nodeId: scored2.nodeId, securityScore: 90 },
      { nodeId: scored1.nodeId, securityScore: 40 },
    ]);
  });

  it("returns an empty ranking, not zero-filled entries, when nothing has been analyzed", () => {
    const summary = analyzeSubscription([node(), node()]);
    expect(summary.securityRanking).toEqual([]);
  });
});
