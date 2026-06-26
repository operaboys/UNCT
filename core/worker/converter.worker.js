/**
 * ConverterWorker — REAL wrapper (09-DEVELOPMENT_ROADMAP Phase 7, Item 5).
 * The Converter Engine itself is complete (Items 1-4: to-url/to-xray/
 * to-singbox/to-clash) and frozen; this file adds zero conversion logic of
 * its own (ADR-003) — it only calls `convertBatch` (`core/converter/
 * conversion.js`, ADR-012), exactly mirroring how `parser.worker.js` wraps
 * `parseWithFallback`/`normalizeAll`.
 *
 * Input payload: `{ nodes: UNMNode[], targetFormat: ExportFormat }` — one of
 * `"url" | "xrayJson" | "singboxJson" | "clashYaml"` (ADR-012's four formats).
 * Output result: `{ converted: {nodeId, output}[], skipped: {nodeId,
 * protocol}[] }` — `convertBatch`'s own return shape, passed through
 * unchanged. A node lands in `skipped`, never throws the whole job, when its
 * protocol is outside the target format's scope (e.g. a wireguard node
 * against `"xrayJson"`) — the same no-throw-as-control-flow discipline
 * `convertBatch` itself follows.
 *
 * Nodes arrive in their ordinary `UNMNode` shape (not flattened): unlike
 * `parser.worker.js`'s OUTPUT, which flattens before `postMessage` (10-
 * PERFORMANCE_ENGINE §3), the Converter's INPUT is whatever the caller
 * already holds — a flattened node still carries every field a serializer
 * reads (`protocol`, `address`, `extensions`, ...) untouched on its
 * destructured "core", so either shape works, but no flatten/unflatten step
 * lives in this file (it is not the Converter's job).
 */
import { convertBatch } from "../converter/conversion.js";
import { createWorkerEntry } from "./shared/handler-envelope.js";

/**
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../converter/conversion.js").ExportFormat} ExportFormat
 */

/**
 * @param {unknown} payload
 */
function processConverterPayload(payload) {
  const { nodes, targetFormat } = /** @type {{ nodes?: unknown, targetFormat?: unknown }} */ (payload || {});
  if (!Array.isArray(nodes)) {
    throw new Error("converter.worker: payload.nodes must be an array (WORKER_CONTRACT_VIOLATION)");
  }
  if (typeof targetFormat !== "string") {
    throw new Error("converter.worker: payload.targetFormat must be a string (WORKER_CONTRACT_VIOLATION)");
  }
  return convertBatch(/** @type {UNMNode[]} */ (nodes), /** @type {ExportFormat} */ (targetFormat));
}

/** Pure, directly-callable handler; also self-wires to `self.onmessage` under feature detection. */
export const handleConverterJob = createWorkerEntry(processConverterPayload);
