/**
 * Subscription Builder — Export Engine (P12-9, doc 03 §6, ADR-004: Exporter
 * lives in `core/`). The exact inverse of `core/parser/subscription/`
 * (SubscriptionParser, ADR-008): that parser turns ONE blob (plain-text URL
 * list, or the same list wrapped in Base64) into MANY `UNMNode`s; this builds
 * ONE blob back out of MANY `UNMNode`s — nodes and Templates alike, since a
 * Template IS a `UNMNode` (see `core/storage/template-store.js`'s header
 * comment) and needs no special-casing here.
 *
 * Reuses `exportTxt` (`to-txt.js`) for the actual per-node URL serialization
 * (Batch Conversion, "url" format) instead of re-deriving it — the "plain"
 * encoding case IS `exportTxt`'s content, byte for byte. The only new step is
 * the encode: wrapping that same content in Base64 via `to-url.js`'s
 * `encodeBase64` — the exact inverse of
 * `core/parser/subscription/decode.js`'s `decodeSubscription`, which already
 * unwraps a Base64 subscription blob by decoding then checking for URL
 * lines. Round-trip: `parseSubscription(buildSubscription(nodes).content)`
 * reproduces the same nodes (proven in
 * `tests/exporter/subscription-builder.test.js`).
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */
import { exportTxt } from "./to-txt.js";
import { withSkipReason } from "./skip-reason.js";
import { encodeBase64 } from "../converter/to-url.js";

/**
 * @param {readonly UNMNode[]} nodes
 * @param {{ encoding?: "base64" | "plain" }} [options]
 * @returns {{ content: string, skipped: {nodeId: string, protocol: string, reason: string}[] }}
 */
export function buildSubscription(nodes, options = {}) {
  const encoding = options.encoding ?? "base64";
  const { content, skipped: txtSkipped } = exportTxt(nodes);
  // Relabel exportTxt's own "not supported by TXT export" reason — accurate
  // here too, but "Subscription" names the actual operation the caller asked for.
  const skipped = withSkipReason(
    txtSkipped.map(({ nodeId, protocol }) => ({ nodeId, protocol })),
    "Subscription",
  );
  return { content: encoding === "plain" ? content : encodeBase64(content), skipped };
}
