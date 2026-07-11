/**
 * Unit tests for core/analyzer/extended/rule-analyzer.js (P12-5).
 *
 * Tests cover:
 *  1. not-applicable result for nodes without extensions.configRules
 *     (Xray/URL/WireGuard/subscription source types)
 *  2. Clash rule extraction: total count, category counts, duplicate detection
 *  3. Sing-box rule extraction: total count, category counts, duplicate detection
 *  4. Nodes with configRules present but empty rules array → not applicable
 *  5. Architecture Guard: rule-analyzer.js lives in core/analyzer/extended/ —
 *     NOT in a protected pipeline dir, and imports no core/network/ module
 */

import { describe, it, expect } from "vitest";
import { analyzeRules } from "../../core/analyzer/extended/rule-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {Partial<import("../../core/types/unm").UNMNode> & { extensions?: any }} extra */
function makeNode(extra = {}) {
  return createNode({
    sourceType: "xray-json",
    protocol: "vless",
    address: "proxy.example.com",
    port: 443,
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// 1. No-rules (not applicable) sources
// ---------------------------------------------------------------------------

describe("analyzeRules — not applicable", () => {
  it("returns applicable:false for a node with no extensions at all", () => {
    const node = makeNode();
    const result = analyzeRules(node);
    expect(result.applicable).toBe(false);
    expect(result.totalCount).toBe(0);
    expect(result.byCategory).toEqual({});
    expect(result.duplicateCount).toBe(0);
    expect(result.duplicates).toEqual([]);
  });

  it("returns applicable:false when extensions has no configRules", () => {
    const node = makeNode({ extensions: { configDns: { servers: ["8.8.8.8"], fakeIp: false } } });
    const result = analyzeRules(node);
    expect(result.applicable).toBe(false);
  });

  it("returns applicable:false when configRules.rules is an empty array", () => {
    const node = makeNode({ extensions: { configRules: { source: "clash", rules: [] } } });
    const result = analyzeRules(node);
    expect(result.applicable).toBe(false);
  });

  it("returns applicable:false when configRules.source is unknown", () => {
    const node = makeNode({ extensions: { configRules: { source: "xray", rules: ["something"] } } });
    const result = analyzeRules(node);
    expect(result.applicable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Clash rules — categorisation and deduplication
// ---------------------------------------------------------------------------

describe("analyzeRules — Clash source", () => {
  /** @param {string[]} rules */
  function nodeWithClashRules(rules) {
    return makeNode({ extensions: { configRules: { source: "clash", rules } } });
  }

  it("reports totalCount correctly", () => {
    const node = nodeWithClashRules([
      "DOMAIN-SUFFIX,google.com,PROXY",
      "IP-CIDR,10.0.0.0/8,DIRECT",
      "MATCH,DIRECT",
    ]);
    const r = analyzeRules(node);
    expect(r.applicable).toBe(true);
    expect(r.totalCount).toBe(3);
  });

  it("categorises domain rules", () => {
    const node = nodeWithClashRules([
      "DOMAIN,example.com,PROXY",
      "DOMAIN-SUFFIX,google.com,DIRECT",
      "DOMAIN-KEYWORD,ads,REJECT",
      "DOMAIN-REGEX,^ad\\.,REJECT",
      "GEOSITE,cn,DIRECT",
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.domain).toBe(5);
  });

  it("categorises IP rules", () => {
    const node = nodeWithClashRules([
      "IP-CIDR,192.168.0.0/16,DIRECT",
      "IP-CIDR6,::1/128,DIRECT",
      "GEOIP,CN,DIRECT",
      "IP-ASN,13335,PROXY",
      "SRC-IP-CIDR,10.0.0.0/8,DIRECT",
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.ip).toBe(5);
  });

  it("categorises process rules", () => {
    const node = nodeWithClashRules([
      "PROCESS-NAME,Telegram.exe,PROXY",
      "PROCESS-PATH,/usr/bin/curl,PROXY",
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.process).toBe(2);
  });

  it("categorises port rules", () => {
    const node = nodeWithClashRules([
      "DST-PORT,80,PROXY",
      "SRC-PORT,12345,DIRECT",
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.port).toBe(2);
  });

  it("categorises unrecognised rules as 'other'", () => {
    const node = nodeWithClashRules([
      "MATCH,DIRECT",
      "RULE-SET,proxy,PROXY",
      "NETWORK,TCP,PROXY",
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.other).toBe(3);
    expect(r.byCategory.domain).toBeUndefined();
  });

  it("handles a realistic mixed ruleset", () => {
    const node = nodeWithClashRules([
      "DOMAIN-SUFFIX,google.com,PROXY",
      "DOMAIN-SUFFIX,github.com,PROXY",
      "GEOIP,CN,DIRECT",
      "IP-CIDR,192.168.0.0/16,DIRECT",
      "PROCESS-NAME,Telegram.exe,PROXY",
      "MATCH,DIRECT",
    ]);
    const r = analyzeRules(node);
    expect(r.totalCount).toBe(6);
    expect(r.byCategory.domain).toBe(2);
    expect(r.byCategory.ip).toBe(2);
    expect(r.byCategory.process).toBe(1);
    expect(r.byCategory.other).toBe(1);
  });

  it("detects exact duplicate rules", () => {
    const node = nodeWithClashRules([
      "DOMAIN-SUFFIX,google.com,PROXY",
      "GEOIP,CN,DIRECT",
      "DOMAIN-SUFFIX,google.com,PROXY",
    ]);
    const r = analyzeRules(node);
    expect(r.totalCount).toBe(3);
    expect(r.duplicateCount).toBe(1);
    expect(r.duplicates).toContain("DOMAIN-SUFFIX,google.com,PROXY");
  });

  it("detects multiple distinct duplicates", () => {
    const node = nodeWithClashRules([
      "DOMAIN-SUFFIX,a.com,PROXY",
      "DOMAIN-SUFFIX,a.com,PROXY",
      "GEOIP,CN,DIRECT",
      "GEOIP,CN,DIRECT",
    ]);
    const r = analyzeRules(node);
    expect(r.duplicateCount).toBe(2);
    expect(r.duplicates).toHaveLength(2);
  });

  it("returns duplicateCount:0 when no duplicates", () => {
    const node = nodeWithClashRules([
      "DOMAIN-SUFFIX,google.com,PROXY",
      "GEOIP,CN,DIRECT",
      "MATCH,DIRECT",
    ]);
    const r = analyzeRules(node);
    expect(r.duplicateCount).toBe(0);
    expect(r.duplicates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Sing-box rules — categorisation and deduplication
// ---------------------------------------------------------------------------

describe("analyzeRules — Sing-box source", () => {
  /** @param {object[]} rawRules */
  function nodeWithSingBoxRules(rawRules) {
    const rules = rawRules.map((r) => JSON.stringify(r));
    return makeNode({ extensions: { configRules: { source: "singbox", rules } } });
  }

  it("reports totalCount correctly", () => {
    const node = nodeWithSingBoxRules([
      { domain: ["google.com"], outbound: "proxy" },
      { ip_cidr: ["10.0.0.0/8"], outbound: "direct" },
      { protocol: "dns", outbound: "dns-out" },
    ]);
    const r = analyzeRules(node);
    expect(r.applicable).toBe(true);
    expect(r.totalCount).toBe(3);
  });

  it("categorises domain rules", () => {
    const node = nodeWithSingBoxRules([
      { domain: ["example.com"], outbound: "proxy" },
      { domain_suffix: [".google.com"], outbound: "proxy" },
      { domain_regex: ["^ad\\."], outbound: "reject" },
      { domain_keyword: ["ads"], outbound: "reject" },
      { geosite: ["cn"], outbound: "direct" },
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.domain).toBe(5);
  });

  it("categorises IP rules", () => {
    const node = nodeWithSingBoxRules([
      { ip_cidr: ["192.168.0.0/16"], outbound: "direct" },
      { geoip: ["cn"], outbound: "direct" },
      { source_ip_cidr: ["10.0.0.0/8"], outbound: "direct" },
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.ip).toBe(3);
  });

  it("categorises process rules", () => {
    const node = nodeWithSingBoxRules([
      { process_name: ["Telegram.exe"], outbound: "proxy" },
      { process_path: ["/usr/bin/curl"], outbound: "proxy" },
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.process).toBe(2);
  });

  it("categorises protocol rules", () => {
    const node = nodeWithSingBoxRules([
      { protocol: "dns", outbound: "dns-out" },
      { network: "tcp", outbound: "proxy" },
      { inbound: ["tun-in"], outbound: "direct" },
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.protocol).toBe(3);
  });

  it("categorises port rules", () => {
    const node = nodeWithSingBoxRules([
      { port: [80, 443], outbound: "proxy" },
      { port_range: ["8080:8090"], outbound: "proxy" },
      { source_port: [12345], outbound: "direct" },
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.port).toBe(3);
  });

  it("categorises rule_set and other unknown fields as 'other'", () => {
    const node = nodeWithSingBoxRules([
      { rule_set: "geosite-cn", outbound: "direct" },
      { clash_mode: "Global", outbound: "proxy" },
    ]);
    const r = analyzeRules(node);
    expect(r.byCategory.other).toBe(2);
  });

  it("handles malformed JSON rule strings gracefully (treats as 'other')", () => {
    const node = makeNode({
      extensions: { configRules: { source: "singbox", rules: ["not-json", "{}"] } },
    });
    const r = analyzeRules(node);
    expect(r.applicable).toBe(true);
    expect(r.totalCount).toBe(2);
    expect(r.byCategory.other).toBe(2);
  });

  it("detects exact duplicate Sing-box rules", () => {
    const dup = JSON.stringify({ domain: ["google.com"], outbound: "proxy" });
    const other = JSON.stringify({ geoip: ["cn"], outbound: "direct" });
    const node = makeNode({
      extensions: { configRules: { source: "singbox", rules: [dup, other, dup] } },
    });
    const r = analyzeRules(node);
    expect(r.totalCount).toBe(3);
    expect(r.duplicateCount).toBe(1);
    expect(r.duplicates).toContain(dup);
  });
});

// ---------------------------------------------------------------------------
// 4. Integration: extractSingBoxRules + extractClashRules (parser-level)
// ---------------------------------------------------------------------------

describe("Rule extraction integration — parseSingBox / parseClash", () => {
  it("extractSingBoxRules stores configRules in RawExtraction fields", async () => {
    const { extractSingBoxRules } = await import("../../core/parser/singbox/extract.js");
    const config = {
      route: {
        rules: [
          { domain: ["google.com"], outbound: "proxy" },
          { ip_cidr: ["10.0.0.0/8"], outbound: "direct" },
        ],
      },
    };
    const result = extractSingBoxRules(config);
    expect(result).not.toBeUndefined();
    expect(result?.source).toBe("singbox");
    expect(result?.rules).toHaveLength(2);
    expect(result?.rules[0]).toBe(JSON.stringify({ domain: ["google.com"], outbound: "proxy" }));
  });

  it("extractSingBoxRules returns undefined when route.rules is absent", async () => {
    const { extractSingBoxRules } = await import("../../core/parser/singbox/extract.js");
    expect(extractSingBoxRules({ outbounds: [] })).toBeUndefined();
    expect(extractSingBoxRules({ route: {} })).toBeUndefined();
    expect(extractSingBoxRules({ route: { rules: [] } })).toBeUndefined();
  });

  it("extractClashRules stores configRules from the rules: array", async () => {
    const { extractClashRules } = await import("../../core/parser/clash/extract.js");
    const doc = {
      rules: [
        "DOMAIN-SUFFIX,google.com,PROXY",
        "GEOIP,CN,DIRECT",
        "MATCH,DIRECT",
      ],
    };
    const result = extractClashRules(doc);
    expect(result).not.toBeUndefined();
    expect(result?.source).toBe("clash");
    expect(result?.rules).toHaveLength(3);
    expect(result?.rules[0]).toBe("DOMAIN-SUFFIX,google.com,PROXY");
  });

  it("extractClashRules returns undefined when rules: is absent or has no strings", async () => {
    const { extractClashRules } = await import("../../core/parser/clash/extract.js");
    expect(extractClashRules({})).toBeUndefined();
    expect(extractClashRules({ rules: [] })).toBeUndefined();
    expect(extractClashRules({ rules: [42, null] })).toBeUndefined();
  });

  it("Sing-box node produced by parseSingBox carries configRules in extensions", async () => {
    const { parseSingBox } = await import("../../core/parser/singbox/extract.js");
    const { normalizeManySingBox } = await import("../../core/parser/singbox/normalize.js");
    const config = JSON.stringify({
      outbounds: [
        { type: "vless", tag: "proxy", server: "a.example.com", server_port: 443,
          uuid: "00000000-0000-0000-0000-000000000001", tls: { enabled: true } },
      ],
      route: {
        rules: [
          { domain: ["google.com"], outbound: "proxy" },
          { geoip: ["cn"], outbound: "direct" },
        ],
      },
    });
    const extraction = parseSingBox(config);
    const [node] = normalizeManySingBox(extraction);
    const ext = /** @type {any} */ (node.extensions);
    expect(ext?.configRules?.source).toBe("singbox");
    expect(ext?.configRules?.rules).toHaveLength(2);
    const ruleAnalysis = analyzeRules(node);
    expect(ruleAnalysis.applicable).toBe(true);
    expect(ruleAnalysis.totalCount).toBe(2);
    expect(ruleAnalysis.byCategory.domain).toBe(1);
    expect(ruleAnalysis.byCategory.ip).toBe(1);
  });

  it("Clash node produced by parseClash carries configRules in extensions", async () => {
    const { parseClash } = await import("../../core/parser/clash/extract.js");
    const { normalizeManyClash } = await import("../../core/parser/clash/normalize.js");
    const clashYaml = `
proxies:
  - name: "test-proxy"
    type: vless
    server: proxy.example.com
    port: 443
    uuid: "00000000-0000-0000-0000-000000000001"
    tls: true
rules:
  - DOMAIN-SUFFIX,google.com,PROXY
  - GEOIP,CN,DIRECT
  - PROCESS-NAME,curl,DIRECT
  - MATCH,DIRECT
`;
    const extraction = parseClash(clashYaml);
    const [node] = normalizeManyClash(extraction);
    const ext = /** @type {any} */ (node.extensions);
    expect(ext?.configRules?.source).toBe("clash");
    expect(ext?.configRules?.rules).toHaveLength(4);
    const ruleAnalysis = analyzeRules(node);
    expect(ruleAnalysis.applicable).toBe(true);
    expect(ruleAnalysis.totalCount).toBe(4);
    expect(ruleAnalysis.byCategory.domain).toBe(1);
    expect(ruleAnalysis.byCategory.ip).toBe(1);
    expect(ruleAnalysis.byCategory.process).toBe(1);
    expect(ruleAnalysis.byCategory.other).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Architecture Guard compatibility
// ---------------------------------------------------------------------------

describe("architecture", () => {
  it("rule-analyzer.js is pure (no core/network/ imports, no fetch)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(thisDir, "../../core/analyzer/extended/rule-analyzer.js"), "utf-8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\bXMLHttpRequest\b/);
    expect(src).not.toMatch(/from\s+['"][^'"]*\/network\/[^'"]*['"]/);
  });
});
