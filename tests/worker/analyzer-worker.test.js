/**
 * analyzer.worker.js tests (09-DEVELOPMENT_ROADMAP Phase 6 Core complete;
 * worker wired in alongside Phase 7 Item 5).
 *
 * Mirrors converter-worker.test.js's structure: `handleAnalyzerJob` called
 * directly (no DOM/Worker globals, ADR-003) for unit-level checks, then a
 * real `WorkerManager` + Worker Mock end-to-end block — the analyzer
 * counterpart of the Converter's Cross-Format E2E proof: REAL Parser-
 * produced nodes (the same detect -> extract -> normalize pipeline, never a
 * hand-built fixture) dispatched through the real Worker pool, run through
 * all six §1.0-§1.5 Core analyzers, asserting the resulting verdict bundle is
 * coherent and its one frozen `AnalysisObject` field (`securityScore`, the
 * only one the six Core modules can fill today — see analyze-node.js) is a
 * valid 0-100 integer. The worker output matches calling `analyzeBatch`
 * directly, proving the Worker -> chain wiring with zero logic of its own.
 */
import { describe, it, expect } from "vitest";
import { handleAnalyzerJob } from "../../core/worker/analyzer.worker.js";
import { analyzeBatch } from "../../core/analyzer/analyze-node.js";
import { createWorkerManager } from "../../core/worker/worker-manager.js";
import { createMockWorkerFactory } from "../setup/worker-mock.js";
import { parseUrl, normalizeUrl } from "../../core/parser/url/index.js";
import { VLESS_REALITY, TROJAN_WS, HY2, TUIC, WIREGUARD, SS_SIP002 } from "../url/fixtures.js";

/** Worker envelope results are intentionally `unknown` outside the Worker (10-PERFORMANCE_ENGINE §3) — tests narrow at the assertion site. @param {unknown} value */
function asRecord(value) {
  return /** @type {Record<string, any>} */ (value);
}

/** Real Parser pipeline (Stage 07 extract -> Stage 13.1/14 normalize) — never a hand-built node. @param {string} raw */
const parse = (raw) => normalizeUrl(parseUrl(raw));

const NODES = [VLESS_REALITY, TROJAN_WS, HY2, TUIC, WIREGUARD, SS_SIP002].map(parse);

describe("handleAnalyzerJob — direct invocation (pure, no Worker globals)", () => {
  it("wraps analyzeBatch behind the standard envelope, keyed by nodeId", async () => {
    const node = parse(VLESS_REALITY);
    const response = await handleAnalyzerJob({
      jobId: "a1", generationId: 1, track: "analyze", payload: { nodes: [node] },
    });
    expect(response).toMatchObject({ jobId: "a1", generationId: 1, track: "analyze", ok: true });
    const result = asRecord(response.result);
    expect(result.analyzed).toHaveLength(1);
    expect(result.analyzed[0].nodeId).toBe(node.nodeId);
    expect(result.analyzed[0].analysis.security.securityScore).toBe(87); // matches the e2e chain test
  });

  it("produces exactly what analyzeBatch produces (zero logic of its own)", async () => {
    const response = await handleAnalyzerJob({ jobId: "a2", generationId: 1, payload: { nodes: NODES } });
    expect(asRecord(response.result)).toEqual(analyzeBatch(NODES));
  });

  it("rejects a non-array payload.nodes as a contract violation, not a silent passthrough", async () => {
    const response = await handleAnalyzerJob({ jobId: "a3", generationId: 1, payload: {} });
    expect(response.ok).toBe(false);
    expect(response.error?.message).toMatch(/WORKER_CONTRACT_VIOLATION/);
  });
});

describe("E2E: real Worker pool dispatch x all six Core analyzers", () => {
  it("analyzes every real Parser-produced node through the real Worker pool into a coherent verdict bundle", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleAnalyzerJob), poolSize: 4,
    });
    const { promise } = manager.runJob({ nodes: NODES }, { track: "analyze" });
    const result = asRecord(await promise);

    expect(result.analyzed).toHaveLength(NODES.length);
    for (let i = 0; i < NODES.length; i += 1) {
      const node = NODES[i];
      const { nodeId, analysis } = result.analyzed[i];
      expect(nodeId).toBe(node.nodeId);
      // Every real Parser output names a known protocol the six modules accept.
      expect(analysis.protocol).toEqual({ protocol: node.protocol, recognized: true });
      expect(typeof analysis.network.compatible).toBe("boolean");
      expect(typeof analysis.tls.applicable).toBe("boolean");
      expect(typeof analysis.reality.applicable).toBe("boolean");
      // The one frozen AnalysisObject field the Core modules can fill today.
      const score = analysis.security.securityScore;
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Array.isArray(analysis.security.issues)).toBe(true);
    }
  });
});
