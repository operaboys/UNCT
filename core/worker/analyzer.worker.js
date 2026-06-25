/**
 * AnalyzerWorker — STUB ONLY (09-DEVELOPMENT_ROADMAP: Analyzer is Phase 6,
 * `core/analyzer/` does not exist yet). This file exists now purely to give
 * the Worker Manager a stable contract to coordinate against early —
 * `processAnalyzerPayload` below is a passthrough placeholder, not real
 * analysis. Real logic will be added in Phase 6 by replacing the body of
 * `processAnalyzerPayload` with a call into `core/analyzer/`; the envelope
 * wiring (jobId/generationId/track, `self.onmessage`) is shared plumbing
 * (ADR-003, ADR-010) and should not need to change.
 *
 * Input payload (tentative — Phase 6 may extend): `{ nodes: FlatNode[] }`,
 * the flattened nodes `parser.worker.js` already produces.
 * Output result (tentative, currently a no-op passthrough):
 * `{ analyzed: FlatNode[] }`.
 */
import { createWorkerEntry } from "./shared/handler-envelope.js";

/**
 * @param {unknown} payload
 */
function processAnalyzerPayload(payload) {
  // STUB: no real Analyzer logic yet (Phase 6, core/analyzer/).
  const nodes = /** @type {{ nodes?: unknown[] }} */ (payload || {}).nodes || [];
  return { analyzed: nodes };
}

/** Pure, directly-callable handler; also self-wires to `self.onmessage` under feature detection. */
export const handleAnalyzerJob = createWorkerEntry(processAnalyzerPayload);
