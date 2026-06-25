/**
 * ConverterWorker — STUB ONLY (09-DEVELOPMENT_ROADMAP: Converter is Phase 7,
 * `core/converter/` does not exist yet). This file exists now purely to give
 * the Worker Manager a stable contract to coordinate against early —
 * `processConverterPayload` below is a passthrough placeholder, not a real
 * conversion. Real logic will be added in Phase 7 by replacing the body of
 * `processConverterPayload` with a call into `core/converter/`; the envelope
 * wiring (jobId/generationId/track, `self.onmessage`) is shared plumbing
 * (ADR-003, ADR-010) and should not need to change.
 *
 * Input payload (tentative — Phase 7 may extend):
 * `{ nodes: FlatNode[], targetFormat: string }`.
 * Output result (tentative, currently a no-op passthrough):
 * `{ converted: [] }`.
 */
import { createWorkerEntry } from "./shared/handler-envelope.js";

/**
 * @param {unknown} payload
 */
function processConverterPayload(payload) {
  // STUB: no real Converter logic yet (Phase 7, core/converter/).
  void payload;
  return { converted: [] };
}

/** Pure, directly-callable handler; also self-wires to `self.onmessage` under feature detection. */
export const handleConverterJob = createWorkerEntry(processConverterPayload);
