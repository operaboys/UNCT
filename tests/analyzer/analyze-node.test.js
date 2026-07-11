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
import { computeCompatibilityScore, computeRiskScore } from "../../core/analyzer/risk-score.js";

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

describe("analyzeNode — compatibilityScore/riskScore wiring (ADR-027)", () => {
  it("bundle's compatibilityScore/riskScore exactly match computeCompatibilityScore/computeRiskScore applied to the same bundle's own fields", () => {
    const n = node({ uuid: "b831381d-6324-4d53-ad4f-8cda48b30811", encryption: "none", sni: "a.com", fingerprint: "chrome", alpn: ["h2"] });
    const bundle = analyzeNode(n);
    const expectedCompatibilityScore = computeCompatibilityScore(bundle.compatibility);
    expect(bundle.compatibilityScore).toBe(expectedCompatibilityScore);
    expect(bundle.riskScore).toBe(computeRiskScore({
      securityScore: bundle.security.securityScore,
      compatibilityScore: expectedCompatibilityScore,
      dnsLeakRisk: bundle.dns,
    }));
  });

  it("Reality's structural issues move riskScore exactly once (through securityScore), never a second time through a separate Reality term", () => {
    // Two otherwise-identical Reality nodes; only pbk differs (missing vs present) -- a pure
    // Reality Analyzer issue, feeding `security.issues`/`securityScore` (ADR-011) and nothing else
    // that computeRiskScore reads directly (it has no `reality` parameter at all).
    const withPbk = node({
      security: "reality", sni: "a.com", fingerprint: "chrome", alpn: ["h2"], flow: "xtls-rprx-vision",
      encryption: "none", pbk: "X".repeat(43), sid: "ab12",
    });
    const withoutPbk = node({
      security: "reality", sni: "a.com", fingerprint: "chrome", alpn: ["h2"], flow: "xtls-rprx-vision",
      encryption: "none", sid: "ab12",
    });
    const bundleWithPbk = analyzeNode(withPbk);
    const bundleWithoutPbk = analyzeNode(withoutPbk);

    // The missing-pbk penalty (8 points, ADR-011) shows up exactly once in securityScore...
    expect(bundleWithoutPbk.security.securityScore).toBe(bundleWithPbk.security.securityScore - 8);
    // ...compatibilityScore is untouched by this structural difference (REALITY_CLIENT_SUPPORT
    // depends only on `security === "reality"`, which is true for both nodes here)...
    expect(bundleWithoutPbk.compatibilityScore).toBe(bundleWithPbk.compatibilityScore);
    // ...and riskScore's entire shift is explained by computeRiskScore's own 0.5 security weight
    // applied to that single 8-point securityScore delta -- proving no separate Reality term
    // exists. riskScore is the INVERSE of securityScore (lower = better), so the node missing pbk
    // (lower securityScore) has the HIGHER riskScore.
    expect(bundleWithoutPbk.riskScore - bundleWithPbk.riskScore).toBe(Math.round(0.5 * 8));
  });
});
