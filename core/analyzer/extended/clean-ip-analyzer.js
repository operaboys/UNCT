/**
 * Clean IP Analyzer — 06-ANALYZER_ENGINE §2.3, Phase 10
 * (09-DEVELOPMENT_ROADMAP).
 *
 * Detects the "Clean IP" structural pattern: the connection target (`address`)
 * is a raw IPv4 or IPv6 address while the TLS handshake domain (`host`/`sni`)
 * is a separate, fully-qualified domain name.
 *
 * BOUNDARY — what this analyzer is NOT:
 *  - NOT a liveness/connectivity check (doc 01 Non-Goals: UNCT is not a
 *    Real-Time Connection Engine). "Clean" here means structurally matching
 *    the CDN-bypass pattern, NOT "currently unblocked or reachable".
 *  - NOT an IP reputation check: no IP list is embedded (Rule 9 / task
 *    constraint). All judgment is derived from the UNMNode fields alone.
 *  - NOT a Cloudflare detector: that is §2.1 / cloudflare-analyzer.js. A node
 *    can be both Clean-IP and Cloudflare, or either, or neither — independent.
 *
 * Structural rationale (from real-world CDN-bypass configurations):
 *  In CDN-based proxying the operator connects to a "clean" IP address that
 *  is not yet singled out per-IP by the censor's blocklist, while SNI carries
 *  a CDN-fronted domain so the traffic looks indistinguishable from ordinary
 *  CDN traffic to a DPI observer. The structural signature of this pattern is:
 *    address  = raw IPv4 or IPv6  (no DNS lookup needed)
 *    host/sni = domain name that is DIFFERENT from address
 *
 * Signal catalogue:
 *
 *  ① address is a raw IPv4 (weight 1 preliminary — raised if ② is also met)
 *    or a raw IPv6 (same logic). The address field being an IP at all is
 *    necessary but not sufficient: if both address and host/sni resolve to the
 *    same host they are not "separated" and the pattern is not present.
 *
 *  ② host or sni contains a domain name that differs from the address string.
 *    Required to confirm the separation. When present alongside ①, the pair
 *    constitutes the complete pattern (confidence HIGH).
 *
 *  ③ address is an IP and host/sni is ABSENT: partial pattern, lower
 *    confidence (MEDIUM) — the SNI field may simply not have been captured,
 *    or this may be a non-CDN direct-IP config.
 *
 * Confidence derivation:
 *  HIGH   → address is IP  AND  host/sni is a different domain (full pattern)
 *  MEDIUM → address is IP  AND  host/sni absent/empty (incomplete)
 *  LOW    → address is IP  AND  host/sni equals address (no separation)
 *  no output (isCleanIpPattern=false, confidence="low") when address is a
 *  domain (no IP at all) or both host/sni equal the address.
 *
 * isCleanIpPattern = true iff confidence is HIGH (full structural pattern).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").CleanIpAnalysis} CleanIpAnalysis
 */

import { isValidIPv4, isValidIPv6 } from "../../validator/validators.js";

/**
 * Return true if `val` is a non-empty string that is NOT an IP address —
 * i.e. it is a domain / hostname.
 * @param {unknown} val
 * @returns {boolean}
 */
function isDomainString(val) {
  if (typeof val !== "string" || val.length === 0) return false;
  return !isValidIPv4(val) && !isValidIPv6(val);
}

/**
 * Return true if `val` is a non-empty string that equals `address` (case-
 * insensitive), meaning address and host/sni name the same target.
 * @param {unknown} val
 * @param {string} address
 * @returns {boolean}
 */
function equalsAddress(val, address) {
  return typeof val === "string" && val.length > 0 &&
    val.toLowerCase() === address.toLowerCase();
}

/**
 * Analyze a single UNMNode for the Clean IP structural pattern.
 * @param {UNMNode} node
 * @returns {CleanIpAnalysis}
 */
export function analyzeCleanIp(node) {
  /** @type {string[]} */
  const signals = [];

  const addrIsIPv4 = isValidIPv4(node.address);
  const addrIsIPv6 = isValidIPv6(node.address);
  const addrIsIp = addrIsIPv4 || addrIsIPv6;

  if (!addrIsIp) {
    // address is a domain — Clean IP pattern is not present.
    return { isCleanIpPattern: false, confidence: "low", signals: [] };
  }

  const addrKind = addrIsIPv4 ? "IPv4" : "IPv6";
  signals.push(`address is a raw ${addrKind} (${node.address}) — necessary precondition for Clean IP pattern`);

  // Check whether host or sni carries a domain name separate from address.
  const hostIsDomain = isDomainString(node.host) && !equalsAddress(node.host, node.address);
  const sniIsDomain  = isDomainString(node.sni)  && !equalsAddress(node.sni,  node.address);

  if (hostIsDomain || sniIsDomain) {
    if (hostIsDomain) {
      signals.push(`host (${node.host}) is a domain separate from address — TLS SNI will name a CDN-fronted host`);
    }
    if (sniIsDomain) {
      signals.push(`sni (${node.sni}) is a domain separate from address — TLS handshake domain differs from IP target`);
    }
    return { isCleanIpPattern: true, confidence: "high", signals };
  }

  // host/sni is absent, empty, or equals the IP — partial or no separation.
  const hostVal = node.host;
  const sniVal  = node.sni;
  const bothMissing = (!hostVal || hostVal.length === 0) && (!sniVal || sniVal.length === 0);

  if (bothMissing) {
    signals.push("host and sni are both absent — Clean IP pattern is incomplete (no TLS domain set)");
    return { isCleanIpPattern: false, confidence: "medium", signals };
  }

  // host/sni equals the address string — same target, no CDN separation.
  signals.push(`host/sni (${hostVal || sniVal}) matches the IP address — no CDN domain separation detected`);
  return { isCleanIpPattern: false, confidence: "low", signals };
}
