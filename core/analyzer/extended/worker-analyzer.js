/**
 * Worker Analyzer — 06-ANALYZER_ENGINE §2.2, Phase 10
 * (09-DEVELOPMENT_ROADMAP).
 *
 * BOUNDARY — what this analyzer is and is NOT:
 *  - IS an *extractor*: given that the Cloudflare Analyzer has already
 *    decided `likelyCloudflareWorker=true`, this module pulls out the
 *    structured Worker-specific details from the same UNMNode fields.
 *  - NOT a detector: the "is this a Worker?" question is already settled
 *    by the Cloudflare Analyzer (§2.1). This module never re-runs that
 *    signal-weighting logic — it reads the upstream verdict from the
 *    already-computed `CloudflareAnalysis` that `analyzeNode()` threads in.
 *    If `likelyCloudflareWorker` is false, extraction is skipped entirely
 *    (`applicable: false`, all fields null/empty) — Rule 9: no fabricated data.
 *  - NOT a liveness/CDN check (doc 01 Non-Goals).
 *  - NOT a cryptographic validator: the "encoded data" extraction is best-effort
 *    heuristics only. A value that looks Base64-shaped is tried; if the decoded
 *    bytes contain > 10% non-printable characters the raw value is preserved and
 *    flagged `rawBase64Detected: true` — the module makes NO claim about WHAT
 *    that binary data is (Rule 9: never guess meaning from opaque bytes).
 *
 * Extracted fields:
 *  • workerDomain   — the address/host/sni value that carries the Worker domain
 *                     suffix (.workers.dev / .pages.dev), taken as-is.
 *  • pathSegments   — non-empty path segments from `node.path` before '?'.
 *  • uuidSegment    — the first UUID-shaped path segment (RFC 4122 any version),
 *                     already identified as a common CF Worker routing key.
 *  • parameters     — query-string key→value map (values are raw strings, no
 *                     type coercion: ed="2048" not ed=2048).
 *  • encodedDataFindings — Base64-shaped values found in path segments or
 *                     parameter values, with a decode attempt. Each finding
 *                     reports `source` (where the value came from), `raw` (the
 *                     original string), `decoded` (printable text or null), and
 *                     `rawBase64Detected` (true when decoded bytes are binary).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").CloudflareAnalysis} CloudflareAnalysis
 * @typedef {import("../types").WorkerAnalysis} WorkerAnalysis
 * @typedef {import("../types").WorkerEncodedFinding} WorkerEncodedFinding
 */

/** The same suffix set as cloudflare-analyzer.js — used here for EXTRACTION only. */
const CF_WORKER_SUFFIXES = Object.freeze([".workers.dev", ".pages.dev"]);

/**
 * UUID pattern — used to identify UUID segments so they can be captured in
 * `uuidSegment` and excluded from the Base64 scan (UUIDs happen to match
 * hex patterns that look Base64-shaped but are structurally distinct).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Base64 alphabet (standard + URL-safe combined). A segment must consist
 * entirely of these characters (plus `=` padding at the end) to be considered
 * Base64-shaped.
 */
const BASE64_RE = /^[A-Za-z0-9+/\-_]+=*$/;

/**
 * Minimum length for a value to be treated as a candidate for Base64 decoding.
 * Very short values (< 8 chars) are almost certainly not encoded payloads —
 * they are more likely version strings, route prefixes, etc.
 */
const MIN_BASE64_LEN = 8;

/**
 * Find the first of address / host / sni that ends with a Worker/Pages domain
 * suffix. Returns null when none match (e.g. node has only port/path signals).
 * @param {UNMNode} node
 * @returns {string | null}
 */
function findWorkerDomain(node) {
  for (const val of [node.address, node.host, node.sni]) {
    if (typeof val === "string" && val.length > 0) {
      const lower = val.toLowerCase();
      if (CF_WORKER_SUFFIXES.some((s) => lower.endsWith(s))) return val;
    }
  }
  return null;
}

/**
 * Parse a raw query string into a key→value map.
 * Both keys and values are URL-decoded. Keys appearing more than once are
 * overwritten (last-writer-wins) — CF Worker paths rarely repeat keys.
 * @param {string} query  — the part after '?', without the '?' itself
 * @returns {Record<string, string>}
 */
function parseQueryString(query) {
  /** @type {Record<string, string>} */
  const params = {};
  if (!query) return params;
  for (const part of query.split("&")) {
    if (!part) continue;
    const eqIdx = part.indexOf("=");
    try {
      if (eqIdx === -1) {
        params[decodeURIComponent(part)] = "";
      } else {
        const k = decodeURIComponent(part.slice(0, eqIdx));
        const v = decodeURIComponent(part.slice(eqIdx + 1));
        params[k] = v;
      }
    } catch {
      // Malformed percent-encoding — keep the raw pair rather than crashing.
      const k = eqIdx === -1 ? part : part.slice(0, eqIdx);
      const v = eqIdx === -1 ? "" : part.slice(eqIdx + 1);
      params[k] = v;
    }
  }
  return params;
}

/**
 * Return true when `val` looks like it might carry a Base64-encoded payload —
 * long enough, matches the alphabet, and is NOT a UUID (already handled).
 * @param {string} val
 * @returns {boolean}
 */
function isBase64Shaped(val) {
  return val.length >= MIN_BASE64_LEN && !UUID_RE.test(val) && BASE64_RE.test(val);
}

/**
 * Attempt to decode a Base64 value.
 *  - Normalises URL-safe characters (- → +, _ → /) before decoding.
 *  - Uses the Web-standard `atob()` — available in all modern browsers and
 *    Node.js ≥ 16, so no `Buffer`-only path is needed.
 *  - Checks printability: if more than 10% of decoded characters are non-
 *    printable (< 0x20, excluding tab/CR/LF) the result is classified as
 *    binary and `rawBase64Detected` is set to `true` (Rule 9: no guessing).
 *
 * @param {string} val
 * @returns {{ decoded: string | null, rawBase64Detected: boolean }}
 */
function tryDecodeBase64(val) {
  let normalized = val.replace(/-/g, "+").replace(/_/g, "/");
  // Add `=` padding to reach a length that is a multiple of 4.
  while (normalized.length % 4 !== 0) normalized += "=";

  let text;
  try {
    text = atob(normalized);
  } catch {
    // atob throws on invalid input — treat as binary/undecodable.
    return { decoded: null, rawBase64Detected: true };
  }

  let nonPrintable = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Allow tab (0x09), LF (0x0A), CR (0x0D); flag everything else below 0x20.
    if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
      nonPrintable++;
    }
  }

  const ratio = text.length > 0 ? nonPrintable / text.length : 1;
  if (ratio > 0.1) {
    return { decoded: null, rawBase64Detected: true };
  }
  return { decoded: text, rawBase64Detected: false };
}

/**
 * Analyze a single UNMNode for Cloudflare Worker structural details.
 * Must receive the already-computed `CloudflareAnalysis` from the same node
 * so this module does NOT re-run signal detection.
 *
 * @param {UNMNode} node
 * @param {CloudflareAnalysis} cloudflareAnalysis
 * @returns {WorkerAnalysis}
 */
export function analyzeWorker(node, cloudflareAnalysis) {
  if (!cloudflareAnalysis.likelyCloudflareWorker) {
    return {
      applicable: false,
      workerDomain: null,
      pathSegments: [],
      uuidSegment: null,
      parameters: {},
      encodedDataFindings: [],
    };
  }

  const workerDomain = findWorkerDomain(node);

  // Split path from query string.
  const rawPath = typeof node.path === "string" ? node.path : "";
  const qIdx = rawPath.indexOf("?");
  const pathPart  = qIdx >= 0 ? rawPath.slice(0, qIdx) : rawPath;
  const queryPart = qIdx >= 0 ? rawPath.slice(qIdx + 1) : "";

  const pathSegments = pathPart.split("/").filter(Boolean);
  const uuidSegment = pathSegments.find((seg) => UUID_RE.test(seg)) ?? null;
  const parameters  = parseQueryString(queryPart);

  // Scan for Base64-shaped values — path segments (excluding UUID) and param values.
  /** @type {WorkerEncodedFinding[]} */
  const encodedDataFindings = [];

  for (const seg of pathSegments) {
    if (UUID_RE.test(seg)) continue; // already captured in uuidSegment
    if (isBase64Shaped(seg)) {
      const { decoded, rawBase64Detected } = tryDecodeBase64(seg);
      encodedDataFindings.push({ source: `path:${seg}`, raw: seg, decoded, rawBase64Detected });
    }
  }

  for (const [key, val] of Object.entries(parameters)) {
    if (val && isBase64Shaped(val)) {
      const { decoded, rawBase64Detected } = tryDecodeBase64(val);
      encodedDataFindings.push({ source: `param:${key}`, raw: val, decoded, rawBase64Detected });
    }
  }

  return {
    applicable: true,
    workerDomain,
    pathSegments,
    uuidSegment,
    parameters,
    encodedDataFindings,
  };
}
