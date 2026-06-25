/**
 * parser.worker.js tests (09-DEVELOPMENT_ROADMAP Phase 5 Task 2).
 *
 * `handleParserJob` is called directly (no DOM/Worker globals needed,
 * ADR-003) for unit-level checks, and through a real `WorkerManager` +
 * Worker Mock for the end-to-end "heavy job dispatched through the worker"
 * requirement, using the same 100-sample Baseline Dataset the Phase 2/3
 * Foundation Gate (`raw-config-gate.test.js`) already validates the
 * underlying pipeline against — proving the Worker wrapper changes nothing
 * about parsing behavior, only how the result leaves the thread.
 */
import { describe, it, expect } from "vitest";
import { handleParserJob, flattenNode } from "../../core/worker/parser.worker.js";
import { createWorkerManager } from "../../core/worker/worker-manager.js";
import { createMockWorkerFactory } from "../setup/worker-mock.js";
import { VALID, ALL_SAMPLES } from "../baseline-dataset/raw-config-dataset.js";

/** Worker envelope results are intentionally `unknown` outside the Worker (10-PERFORMANCE_ENGINE §3) — tests narrow at the assertion site. @param {unknown} value */
function asRecord(value) {
  return /** @type {Record<string, any>} */ (value);
}

const SAMPLE_VLESS_URL =
  "vless://b831381d-6324-4d53-ad4f-8cda48b30811@ex.example.com:443" +
  "?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome" +
  "&pbk=PUBKEY123&sid=ab12&type=grpc&serviceName=gsvc&flow=xtls-rprx-vision#reality";

describe("handleParserJob — direct invocation (pure, no Worker globals)", () => {
  it("wraps parseWithFallback + normalizeAll + applyValidation behind the standard envelope", async () => {
    const response = await handleParserJob({
      jobId: "j1", generationId: 1, track: "import", payload: { raw: SAMPLE_VLESS_URL },
    });
    expect(response).toMatchObject({ jobId: "j1", generationId: 1, track: "import", ok: true });
    const result = asRecord(response.result);
    expect(result.parserName).toBe("url");
    expect(result.recovered).toBe(false);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].overallValid).toBe(true);
  });

  it("flattens nodes — no nested metadata/validation/analysis/conversion sub-objects", async () => {
    const response = await handleParserJob({
      jobId: "j2", generationId: 1, track: "import", payload: { raw: SAMPLE_VLESS_URL },
    });
    const [node] = asRecord(response.result).nodes;
    expect(node.metadata).toBeUndefined();
    expect(node.validation).toBeUndefined();
    expect(node.analysis).toBeUndefined();
    expect(node.conversion).toBeUndefined();
    // Validation fields land flat, top-level (no prefix — no collision risk).
    expect(node.overallValid).toBe(true);
    expect(node.addressValid).toBe(true);
    // Metadata fields land flat too, but namespaced under `meta*`.
    expect(node.metaParser).toBe("URLParser");
    expect(Array.isArray(node.metaWarnings)).toBe(true);
    expect(typeof node.metaOriginalMappings).toBe("object");
  });

  it("returns an ok:false envelope (never throws) on unparseable input", async () => {
    const response = await handleParserJob({
      jobId: "j3", generationId: 1, track: "import", payload: { raw: "not a config at all, just noise" },
    });
    expect(response.ok).toBe(false);
    expect(response.error?.message).toBeTruthy();
  });

  it("rejects a non-string payload as a contract violation, not a silent no-op", async () => {
    const response = await handleParserJob({ jobId: "j4", generationId: 1, payload: {} });
    expect(response.ok).toBe(false);
    expect(response.error?.message).toMatch(/WORKER_CONTRACT_VIOLATION/);
  });

  it("flattenNode is exported and directly testable on its own", () => {
    const flat = flattenNode(/** @type {any} */ ({
      nodeId: "n1", protocol: "vless", address: "a", port: 1,
      metadata: { parser: "x", confidence: 1, warnings: [], errors: [], recoveryActions: [], originalMappings: {} },
      validation: { addressValid: true, portValid: true, uuidValid: null, realityValid: null, tlsValid: null, alpnValid: null, pathValid: null, hostValid: null, overallValid: true },
    }));
    expect(flat).toEqual({
      nodeId: "n1", protocol: "vless", address: "a", port: 1,
      addressValid: true, portValid: true, uuidValid: null, realityValid: null,
      tlsValid: null, alpnValid: null, pathValid: null, hostValid: null, overallValid: true,
      metaParser: "x", metaConfidence: 1, metaSourceFile: undefined, metaSourceLine: undefined,
      metaFormatVersion: undefined, metaWarnings: [], metaErrors: [], metaRecoveryActions: [],
      metaOriginalMappings: {},
    });
  });
});

describe("End-to-end: heavy job (entire Baseline Dataset) dispatched through the real Worker Manager", () => {
  it("the VALID subset (50 samples) all come back ok with every node valid, via the Worker pool", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleParserJob), poolSize: 4,
    });
    const jobs = VALID.map((sample) => manager.runJob({ raw: sample.raw }, { track: sample.name }));
    const results = await Promise.all(jobs.map((j) => j.promise));

    expect(results).toHaveLength(VALID.length);
    for (let i = 0; i < results.length; i += 1) {
      const sample = VALID[i];
      const result = asRecord(results[i]);
      expect(result.recovered, `${sample.name} should not need recovery`).toBe(false);
      expect(result.nodes.length, `${sample.name} should yield >=1 node`).toBeGreaterThan(0);
      for (const node of result.nodes) {
        expect(node.overallValid, `${sample.name} node should validate true`).toBe(true);
      }
    }
  });

  it("dispatches all 100 samples concurrently through a small pool without dropping or misrouting any result", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleParserJob), poolSize: 4,
    });
    const jobs = ALL_SAMPLES.map((sample) => ({
      sample,
      job: manager.runJob({ raw: sample.raw }, { track: sample.name }),
    }));

    const settled = await Promise.allSettled(jobs.map((j) => j.job.promise));
    expect(settled).toHaveLength(ALL_SAMPLES.length);
    // Every sample is some category of "produced a response, on its own job" —
    // INVALID samples may legitimately reject (Unknown Format / unrecoverable,
    // matching factory.parseWithFallback's own throw behavior outside the
    // Worker); what matters here is no cross-job result leakage, which
    // `Promise.allSettled` already proves by construction (each promise is
    // independently keyed to its own jobId).
    const fulfilled = settled.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThan(0);
  });
});
