/**
 * analyzer.worker.js / converter.worker.js — STUB tests (Phase 5 Task 5).
 * These only assert the envelope/passthrough contract holds; there is no
 * real Analyzer/Converter logic to test yet (Phase 6/7).
 */
import { describe, it, expect } from "vitest";
import { handleAnalyzerJob } from "../../core/worker/analyzer.worker.js";
import { handleConverterJob } from "../../core/worker/converter.worker.js";

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

describe("converter.worker.js (stub)", () => {
  it("returns an empty converted[] placeholder under the standard envelope", async () => {
    const response = await handleConverterJob({
      jobId: "j1", generationId: 1, track: "convert",
      payload: { nodes: [{ nodeId: "n1" }], targetFormat: "vless" },
    });
    expect(response).toEqual({
      jobId: "j1", generationId: 1, track: "convert", ok: true, result: { converted: [] },
    });
  });
});
