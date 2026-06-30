/**
 * Route Rule Analyzer — P12-5.
 *
 * Reads config-level route rules stored at `extensions.configRules`
 * (Clash and Sing-box parsers, same pattern as configDns / ADR-022).
 * Returns a `RuleAnalysis` summary: total count, per-category counts, and
 * detection of exact duplicate rules.
 *
 * Pure & Sync. Returns applicable:false for every node whose source format
 * carries no route table (Xray, URL, WireGuard, subscription) — Rule 9:
 * "not applicable" ≠ "zero rules".
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").RuleAnalysis} RuleAnalysis
 */

// ---------------------------------------------------------------------------
// Clash rule categorisation
// Fields: rule type is the first comma-separated segment, uppercased.
// ---------------------------------------------------------------------------

const CLASH_DOMAIN = new Set([
  "DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-REGEX", "GEOSITE",
]);
const CLASH_IP = new Set([
  "IP-CIDR", "IP-CIDR6", "GEOIP", "IP-ASN", "SRC-IP-CIDR",
]);
const CLASH_PROCESS = new Set(["PROCESS-NAME", "PROCESS-PATH"]);
const CLASH_PORT = new Set(["DST-PORT", "SRC-PORT"]);

/** @param {string} rule */
function categorizeClashRule(rule) {
  const type = rule.split(",")[0]?.trim().toUpperCase() ?? "";
  if (CLASH_DOMAIN.has(type)) return "domain";
  if (CLASH_IP.has(type)) return "ip";
  if (CLASH_PROCESS.has(type)) return "process";
  if (CLASH_PORT.has(type)) return "port";
  return "other";
}

// ---------------------------------------------------------------------------
// Sing-box rule categorisation
// Each rule is JSON.stringify of a rule object; re-parsed here to inspect keys.
// Category is determined by which matcher key is present (first match wins,
// in the order: domain → ip → process → protocol → port → other).
// ---------------------------------------------------------------------------

const SINGBOX_DOMAIN_KEYS = ["domain", "domain_suffix", "domain_regex", "domain_keyword", "geosite"];
const SINGBOX_IP_KEYS = ["ip_cidr", "geoip", "source_ip_cidr", "ip_version", "source_ip_is_private"];
const SINGBOX_PROCESS_KEYS = ["process_name", "process_path", "package_name"];
const SINGBOX_PROTOCOL_KEYS = ["protocol", "network", "inbound"];
const SINGBOX_PORT_KEYS = ["port", "port_range", "source_port", "source_port_range"];

/** @param {string} ruleStr */
function categorizeSingBoxRule(ruleStr) {
  /** @type {any} */
  let obj;
  try { obj = JSON.parse(ruleStr); } catch { return "other"; }
  if (!obj || typeof obj !== "object") return "other";
  if (SINGBOX_DOMAIN_KEYS.some((k) => k in obj)) return "domain";
  if (SINGBOX_IP_KEYS.some((k) => k in obj)) return "ip";
  if (SINGBOX_PROCESS_KEYS.some((k) => k in obj)) return "process";
  if (SINGBOX_PROTOCOL_KEYS.some((k) => k in obj)) return "protocol";
  if (SINGBOX_PORT_KEYS.some((k) => k in obj)) return "port";
  return "other";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** @returns {RuleAnalysis} */
function notApplicable() {
  return { applicable: false, totalCount: 0, byCategory: {}, duplicateCount: 0, duplicates: [] };
}

/**
 * Analyze route rules for a UNMNode.
 * @param {UNMNode} node
 * @returns {RuleAnalysis}
 */
export function analyzeRules(node) {
  const ext = node.extensions;
  if (!ext || typeof ext !== "object") return notApplicable();

  const configRules = /** @type {any} */ (ext).configRules;
  if (!configRules || typeof configRules !== "object") return notApplicable();

  const source = configRules.source;
  const rules = Array.isArray(configRules.rules) ? configRules.rules : [];
  if (source !== "clash" && source !== "singbox") return notApplicable();
  if (rules.length === 0) return notApplicable();

  const categorize = source === "clash" ? categorizeClashRule : categorizeSingBoxRule;

  /** @type {Record<string, number>} */
  const byCategory = {};
  for (const rule of rules) {
    const cat = categorize(String(rule));
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  // Exact-duplicate detection: a rule that appears more than once in the table.
  const seen = new Set();
  const dupSet = new Set();
  for (const rule of rules) {
    const key = String(rule);
    if (seen.has(key)) dupSet.add(key);
    else seen.add(key);
  }
  const duplicates = [...dupSet];

  return {
    applicable: true,
    totalCount: rules.length,
    byCategory,
    duplicateCount: duplicates.length,
    duplicates,
  };
}
