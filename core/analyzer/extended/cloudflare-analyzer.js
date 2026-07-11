/**
 * Cloudflare Analyzer — 06-ANALYZER_ENGINE §2.1, Phase 10
 * (09-DEVELOPMENT_ROADMAP).
 *
 * Detects structural patterns that are strongly associated with Cloudflare
 * Worker endpoints, based on field-level analysis of a single UNMNode. No
 * external list is consulted; all reasoning operates on the node's own fields
 * (address, host, sni, path, port).
 *
 * BOUNDARY — what this analyzer is NOT:
 *  - NOT a liveness/connectivity check (doc 01 Non-Goals: no real-time engine).
 *  - NOT a Cloudflare CDN detector (a domain behind Cloudflare's reverse-proxy
 *    is NOT a Worker/Pages endpoint; the two are architecturally different).
 *  - NOT a definitive verdict: no published header or field unambiguously
 *    identifies a Worker config, so the output is always a *likelihood* with
 *    an explicit confidence level (Rule 9: never claim certainty we don't have).
 *  - NOT the Clean IP pattern (that is §2.3 / clean-ip-analyzer.js).
 *
 * Signal catalogue (based on analysis of BPB-Panel, vless-cf, Hiddify, cfray
 * real-world configurations):
 *
 *  ① address/host/sni ends with ".workers.dev" or ".pages.dev"
 *    — STRONG: these TLDs are Cloudflare-exclusive (assigned only to
 *    Workers/Pages deployments). Weight: 3.
 *
 *  ② path contains early-data query parameter: "ed=2048" or "ed=2560"
 *    — MEDIUM: a WebSocket early-data extension used by BPB-Panel/vless-cf
 *    Workers to push the first client payload in the HTTP Upgrade header,
 *    cutting round-trips. Weight: 2.
 *
 *  ③ path contains a UUID-shaped segment
 *    — MEDIUM: common Cloudflare Worker routing pattern where the Worker uses
 *    the path UUID to multiplex connections. Weight: 2.
 *
 *  ④ port in the Cloudflare-known proxy port set
 *    — WEAK: Cloudflare only reverse-proxies a fixed port set (documented in
 *    Cloudflare Network docs); however many non-Cloudflare services also use
 *    these ports, so this signal is never sufficient alone. Weight: 1.
 *
 * Confidence derivation:
 *  total_weight = sum of all matched signal weights
 *  HIGH   → total_weight ≥ 3  (domain suffix alone, or path+port combo)
 *  MEDIUM → total_weight = 2  (one medium signal, no CF port)
 *  LOW    → total_weight = 1  (CF port only)
 *  LOW    → total_weight = 0  (no signals)
 *
 * likelyCloudflareWorker = true iff confidence is MEDIUM or HIGH.
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").CloudflareAnalysis} CloudflareAnalysis
 */

import { isValidIPv4, isValidIPv6 } from "../../validator/validators.js";

/**
 * Domain suffixes that are exclusively used by Cloudflare Workers/Pages.
 * Custom domains fronted by Cloudflare CDN are deliberately NOT included —
 * they are a different architectural category (reverse-proxy ≠ Worker).
 */
const CF_WORKER_SUFFIXES = Object.freeze([".workers.dev", ".pages.dev"]);

/**
 * Cloudflare reverse-proxy port allowlist (source: Cloudflare Network docs).
 * TLS ports: 443, 8443, 2053, 2083, 2087, 2096
 * non-TLS ports: 80, 8080, 8880, 2052, 2082, 2086, 2095
 */
const CF_PORTS = Object.freeze(new Set([
  443, 8443, 2053, 2083, 2087, 2096,
  80, 8080, 8880, 2052, 2082, 2086, 2095,
]));

/**
 * Early-data query parameter used by BPB-Panel and vless-cf Worker configs
 * to push the first WebSocket frame in the HTTP Upgrade handshake.
 */
const EARLY_DATA_RE = /[?&]ed=(2048|2560)(\b|$)/;

/**
 * UUID-shaped path segment (RFC 4122 any version accepted, case-insensitive).
 * Matches `/uuid`, `/uuid/`, `/uuid?`, `/prefix/uuid`, etc.
 */
const UUID_PATH_RE =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\/|\?|$)/i;

/**
 * @param {unknown} val
 * @returns {boolean}
 */
function hasWorkerSuffix(val) {
  return typeof val === "string" && val.length > 0 &&
    CF_WORKER_SUFFIXES.some((s) => val.toLowerCase().endsWith(s));
}

/**
 * Analyze a single UNMNode for Cloudflare Worker structural patterns.
 * @param {UNMNode} node
 * @returns {CloudflareAnalysis}
 */
export function analyzeCloudflare(node) {
  /** @type {string[]} */
  const signals = [];
  let weight = 0;

  // --- Signal ①: .workers.dev / .pages.dev domain (STRONG, weight 3) ---
  for (const [field, val] of /** @type {[string, unknown][]} */ ([
    ["address", node.address],
    ["host", node.host],
    ["sni", node.sni],
  ])) {
    if (hasWorkerSuffix(val)) {
      signals.push(`${field} ends with a Cloudflare Worker/Pages domain suffix (${String(val)})`);
      weight = Math.max(weight, 3);
    }
  }

  // --- Signal ②: early-data path parameter (MEDIUM, weight 2) ---
  if (node.path && EARLY_DATA_RE.test(node.path)) {
    const match = node.path.match(EARLY_DATA_RE);
    signals.push(`path contains Cloudflare early-data parameter (ed=${match ? match[1] : "?"}): ${node.path}`);
    weight = Math.max(weight, 2);
  }

  // --- Signal ③: UUID-shaped path segment (MEDIUM, weight 2) ---
  if (node.path && UUID_PATH_RE.test(node.path)) {
    signals.push(`path contains a UUID-shaped routing segment (common in Cloudflare Worker configs): ${node.path}`);
    weight = Math.max(weight, 2);
  }

  // --- Signal ④: Cloudflare-known port (WEAK, weight 1) ---
  if (CF_PORTS.has(node.port)) {
    signals.push(`port ${node.port} is in the Cloudflare-proxied port set`);
    weight = Math.max(weight, 1);
  }

  // When a medium path signal (weight 2) is accompanied by a CF port,
  // the combination is strong enough to reach HIGH confidence (total 3).
  // The port alone (weight 1) does NOT trigger this boost.
  if (weight === 2 && CF_PORTS.has(node.port)) {
    weight = 3;
  }

  /** @type {import("../types").AnalysisConfidence} */
  const confidence = weight >= 3 ? "high" : weight === 2 ? "medium" : "low";

  return {
    likelyCloudflareWorker: weight >= 2,
    confidence,
    signals,
  };
}
