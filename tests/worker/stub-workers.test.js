/**
 * analyzer.worker.js — STUB tests (Phase 5 Task 5). Only asserts the
 * envelope/passthrough contract holds; there is no real Analyzer logic
 * wired into this worker yet (a pre-existing gap: `core/analyzer/` itself
 * is complete since Phase 6, but `analyzer.worker.js` was never updated to
 * call it — out of scope for Phase 7 Item 5, which only converts
 * `converter.worker.js`; see `tests/worker/converter-worker.test.js` for its
 * now-real wrapper).
 */
import { describe, it, expect } from "vitest";
import { handleAnalyzerJob } from "../../core/worker/analyzer.worker.js";

describe("analyzer.worker.js (stub)", () => {
  it("passes nodes through unchanged under the standard envelope", async () => {
    const nodes = [{ nodeId: "n1" }, { nodeId: "n2" }];
    const response = await handleAnalyzerJob({
      jobId: "j1", generationId: 1, track: "analyze", payload: { nodes },
    });
    expect(response).toEqual({
      jobId: "j1", generationId: 1, track: "analyze", ok: true, result: { analyzed: nodes },
    });
  });

  it("defaults to an empty array when no nodes are given", async () => {
    const response = await handleAnalyzerJob({ jobId: "j2", generationId: 1, payload: {} });
    expect(response.result).toEqual({ analyzed: [] });
  });
});
