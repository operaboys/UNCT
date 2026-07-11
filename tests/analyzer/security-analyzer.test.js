/**
 * Security Analyzer tests (06-ANALYZER_ENGINE §1.2, ADR-011 formula).
 *
 * Covers:
 *  1. best cases: reality (100) > tls (90) — transportBase only,
 *  2. security "none" on a real-choice protocol is penalized (45),
 *  3. the false-positive fix: security "none" on hysteria2/tuic/wireguard is
 *     NOT penalized (100) — `security` is structurally inert for them,
 *  4. TLS coherence issues feed the score (missing sni),
 *  5. Reality issues feed the score via a COUNT, with NO double-counting of
 *     a TLS-rooted issue (sni) that Reality Analyzer already absorbed,
 *  6. the security-relevant completeness gap term (encryption/method/alpn/
 *     flow only — sni/fingerprint/pbk/sid excluded, already counted upstream),
 *  7. the floor never goes below 0 on a maximally broken node,
 *  8. composition: precomputed completeness/tls/reality matches self-computed.
 */
import { describe, it, expect } from "vitest";
import { analyzeSecurity } from "../../core/analyzer/core/security-analyzer.js";
import { analyzeCompleteness } from "../../core/analyzer/core/data-completeness.js";
import { analyzeTls } from "../../core/analyzer/core/tls-analyzer.js";
import { analyzeReality } from "../../core/analyzer/core/reality-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

const VALID_PBK = "X".repeat(43);
const VALID_SID = "ab12";
const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", ...overrides,
  }));
}

describe("analyzeSecurity — transportBase only (no other issues)", () => {
  it("scores 100 for a fully well-formed reality node", () => {
    const result = analyzeSecurity(node({
      security: "reality", uuid: VALID_UUID, encryption: "none", flow: "xtls-rprx-vision",
      sni: "www.microsoft.com", fingerprint: "chrome", alpn: ["h2", "http/1.1"],
      pbk: VALID_PBK, sid: VALID_SID,
    }));
    expect(result.securityScore).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it("scores 90 for a fully well-formed plain-tls node (transportBase=10)", () => {
    const result = analyzeSecurity(node({
      security: "tls", uuid: VALID_UUID, encryption: "none", flow: "xtls-rprx-vision",
      sni: "www.example.com", fingerprint: "chrome", alpn: ["h2"],
    }));
    expect(result.securityScore).toBe(90);
    expect(result.issues).toEqual([]); // tls's own base penalty is not itself an "issue"
  });

  it("scores 45 for security 'none' on a real-choice protocol (vless)", () => {
    const result = analyzeSecurity(node({ security: "none", uuid: VALID_UUID, encryption: "none" }));
    expect(result.securityScore).toBe(45);
    expect(result.issues.join(" ")).toContain('security: "none"');
  });
});

describe("analyzeSecurity — self-transporting protocols are exempt from transportBase", () => {
  it("does not penalize hysteria2's structural security:'none' (false-positive fix)", () => {
    const result = analyzeSecurity(node({
      protocol: "hysteria2", sourceType: "hysteria2-url", security: "none", password: "x",
    }));
    expect(result.securityScore).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it("does not penalize tuic's structural security:'none'", () => {
    const result = analyzeSecurity(node({
      protocol: "tuic", sourceType: "tuic-url", security: "none", uuid: VALID_UUID, password: "x",
    }));
    expect(result.securityScore).toBe(100);
  });

  it("does not penalize wireguard's structural security:'none'", () => {
    const result = analyzeSecurity(node({ protocol: "wireguard", sourceType: "wireguard-config", security: "none" }));
    expect(result.securityScore).toBe(100);
  });
});

describe("analyzeSecurity — TLS coherence issues feed the score", () => {
  it("deducts for a missing SNI on a plain-tls node", () => {
    const result = analyzeSecurity(node({
      protocol: "trojan", sourceType: "trojan-url", security: "tls",
      fingerprint: "chrome", alpn: ["h2"], password: "x",
    })); // no sni
    expect(result.securityScore).toBe(82); // 100 - 10 (tls base) - 8 (1 tls issue)
    expect(result.issues.join(" ")).toContain("sni is missing");
  });
});

describe("analyzeSecurity — Reality issues feed the score without double-counting", () => {
  it("deducts once for a missing pbk", () => {
    const result = analyzeSecurity(node({
      security: "reality", sni: "a.com", fingerprint: "chrome", alpn: ["h2"],
      flow: "xtls-rprx-vision", encryption: "none",
    })); // no pbk
    expect(result.securityScore).toBe(92); // 100 - 0 (reality base) - 8 (1 reality issue)
    expect(result.issues).toEqual(["pbk is missing — a Reality client cannot connect without a public key"]);
  });

  it("does NOT double-count a missing SNI through both tls.issues and reality.issues", () => {
    const result = analyzeSecurity(node({
      security: "reality", fingerprint: "chrome", pbk: VALID_PBK, sid: VALID_SID,
      alpn: ["h2"], flow: "xtls-rprx-vision", encryption: "none",
    })); // no sni
    // Reality Analyzer absorbs tls.issues itself; the separate TLS term must
    // be suppressed for security==="reality", so "sni is missing" appears
    // exactly once in the combined issues list, and the penalty reflects only
    // ONE issue (8), not two (16).
    const sniMentions = result.issues.filter((i) => i.includes("sni is missing"));
    expect(sniMentions).toHaveLength(1);
    expect(result.securityScore).toBe(92); // 100 - 0 (reality base) - 8 (1 issue, not 16)
  });
});

describe("analyzeSecurity — security-relevant completeness gap", () => {
  it("deducts for a missing ALPN/flow/encryption on an otherwise-coherent reality node", () => {
    const result = analyzeSecurity(node({
      security: "reality", sni: "a.com", fingerprint: "chrome", pbk: VALID_PBK, sid: VALID_SID,
      // alpn, flow, encryption all omitted
    }));
    // 100 - 0 (reality base) - 0 (no tls/reality issues) - 5*3 (alpn+flow+encryption missing)
    expect(result.securityScore).toBe(85);
    expect(result.issues.join(" ")).toContain("alpn is missing");
    expect(result.issues.join(" ")).toContain("flow is missing");
    expect(result.issues.join(" ")).toContain("encryption is missing");
  });

  it("never deducts for sni/fingerprint/pbk/sid through this term (already counted upstream)", () => {
    const withoutSni = analyzeSecurity(node({
      security: "reality", fingerprint: "chrome", pbk: VALID_PBK, sid: VALID_SID,
      alpn: ["h2"], flow: "xtls-rprx-vision", encryption: "none",
    }));
    // Only the single "sni is missing" issue (via reality.issues, weight 8) —
    // never an additional completeness-gap deduction for the same field.
    expect(withoutSni.securityScore).toBe(92);
  });

  it("never deducts for an absent (optional) sid", () => {
    const result = analyzeSecurity(node({
      security: "reality", sni: "a.com", fingerprint: "chrome", pbk: VALID_PBK,
      alpn: ["h2"], flow: "xtls-rprx-vision", encryption: "none",
    })); // no sid — optional, must stay penalty-free
    expect(result.securityScore).toBe(100);
    expect(result.issues).toEqual([]);
  });
});

describe("analyzeSecurity — floor at 0", () => {
  it("never goes negative on a maximally broken node", () => {
    const result = analyzeSecurity(node({
      security: "none", sni: "stray.com", alpn: ["h2"], fingerprint: "bad-fp",
      pbk: "bad-pbk", sid: "xyz",
      // encryption omitted too
    }));
    // base 55 (none) + 8*3 (stray sni/alpn/fingerprint) + 8*2 (stray pbk/sid) + 5*1 (encryption missing) = 100
    expect(result.securityScore).toBe(0);
  });
});

describe("analyzeSecurity — composition", () => {
  it("accepts precomputed completeness/tls/reality and yields the same verdict", () => {
    const n = node({
      security: "reality", sni: "a.com", fingerprint: "chrome", pbk: VALID_PBK, sid: VALID_SID,
      alpn: ["h2"], flow: "xtls-rprx-vision", encryption: "none",
    });
    const selfComputed = analyzeSecurity(n);
    const completeness = analyzeCompleteness(n);
    const tls = analyzeTls(n, completeness);
    const reality = analyzeReality(n, completeness, tls);
    const passedIn = analyzeSecurity(n, completeness, tls, reality);
    expect(passedIn).toEqual(selfComputed);
  });
});
