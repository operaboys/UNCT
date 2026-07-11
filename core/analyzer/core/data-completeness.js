/**
 * Data Completeness Analyzer — 06-ANALYZER_ENGINE §1.0.
 *
 * Built FIRST among the analyzers (09-DEVELOPMENT_ROADMAP Phase 6) because the
 * scoring analyzers (Security §1.2, Reality §1.5, ...) must know which fields
 * are *missing* before they can score — and "missing" ≠ "invalid". An empty
 * `sni` is not a Validation Error (sni is optional, spec 04), yet its absence
 * should pull a Security Score down; that distinction has to be computed
 * somewhere, and this is that somewhere.
 *
 * Strict scope (§1.0): this module answers ONLY "is the field filled in?" for
 * the fields that are *relevant* to a node's protocol/security/transport. It
 * never judges whether a present value is valid (Validation Engine, spec 04)
 * and never assigns a quality score (Security/Reality Analyzer). Pure & Sync —
 * directly unit-testable, and wrapped by `analyzer.worker.js` exactly as the
 * Parser is wrapped by `parser.worker.js` (ADR-003 Separation of Concerns).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").CompletenessResult} CompletenessResult
 */

import { UUID_PROTOCOLS } from "../../unm/schema/enums.js";

/** Protocols whose auth credential is a password (so `password` is relevant). */
const PASSWORD_PROTOCOLS = Object.freeze(["trojan", "shadowsocks", "hysteria2", "tuic"]);

/** Security types that run a TLS handshake (so sni/alpn/fingerprint matter). */
const TLS_LIKE_SECURITY = Object.freeze(["tls", "reality"]);

/** Network transports that carry an HTTP Host header (so `host` is relevant). */
const HOST_NETWORKS = Object.freeze(["ws", "http-upgrade"]);

/** Network transports that carry a path (so `path` is relevant). */
const PATH_NETWORKS = Object.freeze(["ws", "grpc", "http-upgrade", "xhttp"]);

/**
 * Is a field value actually "filled in"? Whitespace-only strings and empty
 * arrays count as absent; any non-empty string/array, and any number/boolean,
 * counts as present.
 * @param {unknown} value
 * @returns {boolean}
 */
function isPresent(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * The single source of truth for "which optional fields are meaningful for
 * this node" — derived from protocol + security + network. Other analyzers
 * (and the completeness score below) build on this rather than re-deriving
 * per-field relevance, so the rule lives in exactly one place (§1.0).
 *
 * Required identity fields (protocol/address/port) are intentionally excluded:
 * a node cannot exist without them (`createNode` enforces it), so they are not
 * "completeness" questions — their *validity* is the Validation Engine's job.
 *
 * @param {UNMNode} node
 * @returns {string[]} relevant optional field names, in a stable order
 */
export function relevantFields(node) {
  /** @type {string[]} */
  const fields = [];

  // ----- Authentication credential (protocol-dependent) -----
  if (UUID_PROTOCOLS.includes(node.protocol)) fields.push("uuid");
  if (PASSWORD_PROTOCOLS.includes(node.protocol)) fields.push("password");
  if (node.protocol === "shadowsocks") fields.push("method");
  if (node.protocol === "vless") fields.push("encryption");

  // ----- Security (security-type dependent) -----
  if (TLS_LIKE_SECURITY.includes(node.security)) fields.push("sni", "alpn", "fingerprint");
  if (node.security === "reality") fields.push("pbk", "sid");

  // ----- Transport features -----
  // VLESS xtls flow only makes sense over a TLS-layer security (tls/reality).
  if (node.protocol === "vless" && TLS_LIKE_SECURITY.includes(node.security)) fields.push("flow");
  if (HOST_NETWORKS.includes(node.network)) fields.push("host");
  if (PATH_NETWORKS.includes(node.network)) fields.push("path");
  if (node.network === "grpc") fields.push("serviceName");

  return fields;
}

/**
 * Run the Data Completeness Analyzer on one node.
 * @param {UNMNode} node
 * @returns {CompletenessResult}
 */
export function analyzeCompleteness(node) {
  const relevant = relevantFields(node);
  /** @type {string[]} */
  const presentOptionalFields = [];
  /** @type {string[]} */
  const missingFields = [];

  for (const field of relevant) {
    const value = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (node))[field];
    if (isPresent(value)) presentOptionalFields.push(field);
    else missingFields.push(field);
  }

  // No relevant optional field => nothing could be missing => fully complete.
  const completenessScore = relevant.length === 0
    ? 100
    : Math.round((presentOptionalFields.length / relevant.length) * 100);

  return { missingFields, presentOptionalFields, completenessScore };
}
