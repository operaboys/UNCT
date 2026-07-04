/**
 * Analyzer Engine composition (`core/analyzer/analyze-node.js`) — this
 * checkpoint's addition: the DNS Analyzer (ADR-022) is now threaded into
 * `analyzeNode`'s bundle as its own independent `dns` field, exactly like
 * `cloudflare`/`cleanIp`/`worker`/`rules` — never folded into `security`
 * (ADR-011 §"Explicitly out of scope" forbids exactly that).
 */
import { describe, it, expect } from "vitest";
import { analyzeNode, analyzeBatch } from "../../core/analyzer/analyze-node.js";
import { analyzeDnsLeakRisk } from "../../core/analyzer/extended/dns-analyzer.js";

/** Build a minimal UNMNode stub for testing. */
function node(overrides = {}) {
  return /** @type {any} */ ({
    nodeId: "test-node",
    sourceType: "xray-json",
    protocol: "vless",
    address: "1.2.3.4",
    port: 443,
    network: "tcp",
    security: "tls",
    metadata: { parser: "XrayParser", confidence: 95, warnings: [], recoveryActions: [], originalMappings: {} },
    ...overrides,
  });
}

describe("analyzeNode — dns field wiring", () => {
  it("bundle's dns field equals analyzeDnsLeakRisk(node) directly (no recomputation drift)", () => {
    const n = node({ extensions: { configDns: { servers: ["8.8.8.8"], fakeIp: false } } });
    const bundle = analyzeNode(n);
    expect(bundle.dns).toBe("high");
    expect(bundle.dns).toBe(analyzeDnsLeakRisk(n));
  });

  it("returns 'unknown' for a node with no DNS data, same as the analyzer alone", () => {
    const n = node();
    expect(analyzeNode(n).dns).toBe("unknown");
  });

  it("dns is untouched by / independent of the security field (ADR-011 boundary)", () => {
    // Same node, two different configDns risk levels -- securityScore must
    // not move even though dns swings from "none" to "high".
    const base = { protocol: "vless", security: "tls", network: "tcp" };
    const safe = node({ ...base, extensions: { configDns: { servers: [], fakeIp: true } } });
    const risky = node({ ...base, extensions: { configDns: { servers: ["8.8.8.8"], fakeIp: false } } });
    const safeBundle = analyzeNode(safe);
    const riskyBundle = analyzeNode(risky);
    expect(safeBundle.dns).toBe("none");
    expect(riskyBundle.dns).toBe("high");
    expect(safeBundle.security.securityScore).toBe(riskyBundle.security.securityScore);
  });

  it("analyzeBatch threads the dns field through for every node", () => {
    const nodes = [
      node({ nodeId: "a", extensions: { configDns: { servers: ["10.0.0.1"], fakeIp: false } } }),
      node({ nodeId: "b" }),
    ];
    const { analyzed } = analyzeBatch(nodes);
    expect(analyzed.find((a) => a.nodeId === "a")?.analysis.dns).toBe("low");
    expect(analyzed.find((a) => a.nodeId === "b")?.analysis.dns).toBe("unknown");
  });
});
