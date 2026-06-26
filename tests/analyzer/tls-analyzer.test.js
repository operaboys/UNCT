/**
 * TLS Analyzer tests (06-ANALYZER_ENGINE §1.3).
 *
 * Covers:
 *  1. security "none" => not applicable; TLS params set there are incoherent,
 *  2. tls/reality => SNI presence (via Data Completeness) + fingerprint check,
 *  3. boundaries: validity (spec 04) and PBK/SID (§1.5) are NOT this module's,
 *  4. the precomputed-completeness path matches the self-computed one.
 */
import { describe, it, expect } from "vitest";
import { analyzeTls } from "../../core/analyzer/core/tls-analyzer.js";
import { analyzeCompleteness } from "../../core/analyzer/core/data-completeness.js";
import { createNode } from "../../core/unm/create-node.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", ...overrides,
  }));
}

describe("analyzeTls — security 'none' (no TLS layer)", () => {
  it("is not applicable and coherent when no TLS params are set", () => {
    const result = analyzeTls(node({ security: "none" }));
    expect(result).toMatchObject({ applicable: false, coherent: true, knownFingerprint: null });
    expect(result.issues).toEqual([]);
  });

  it("flags TLS params set on a non-TLS node as incoherent", () => {
    const result = analyzeTls(node({ security: "none", sni: "example.com", fingerprint: "chrome" }));
    expect(result.applicable).toBe(false);
    expect(result.coherent).toBe(false);
    expect(result.issues.join(" ")).toContain("sni");
    expect(result.issues.join(" ")).toContain("fingerprint");
  });
});

describe("analyzeTls — security 'tls' / 'reality' (TLS handshake present)", () => {
  it("is coherent for a well-set tls node with a known fingerprint", () => {
    const result = analyzeTls(node({ security: "tls", sni: "www.example.com", fingerprint: "chrome" }));
    expect(result).toMatchObject({ applicable: true, coherent: true, knownFingerprint: true });
    expect(result.issues).toEqual([]);
  });

  it("flags a missing SNI (consuming Data Completeness missingFields)", () => {
    const result = analyzeTls(node({ security: "tls" })); // no sni
    expect(result.applicable).toBe(true);
    expect(result.coherent).toBe(false);
    expect(result.issues.join(" ")).toContain("sni is missing");
  });

  it("flags an unrecognized uTLS fingerprint but accepts known ones case-insensitively", () => {
    const bad = analyzeTls(node({ security: "tls", sni: "a.com", fingerprint: "nope-browser" }));
    expect(bad.knownFingerprint).toBe(false);
    expect(bad.coherent).toBe(false);

    const ok = analyzeTls(node({ security: "tls", sni: "a.com", fingerprint: "Firefox" }));
    expect(ok.knownFingerprint).toBe(true);
    expect(ok.coherent).toBe(true);
  });

  it("treats reality like tls for the handshake fields (SNI/fingerprint), ignoring PBK/SID", () => {
    // PBK present/absent must not change TLS Analyzer's verdict — that is §1.5.
    const withoutPbk = analyzeTls(node({ security: "reality", sni: "www.microsoft.com", fingerprint: "chrome" }));
    const withPbk = analyzeTls(node({
      security: "reality", sni: "www.microsoft.com", fingerprint: "chrome", pbk: "SOMEKEY", sid: "ab",
    }));
    expect(withoutPbk.coherent).toBe(true);
    expect(withPbk.coherent).toBe(true);
    expect(withoutPbk.issues).toEqual(withPbk.issues);
  });

  it("knownFingerprint is null when no fingerprint is set", () => {
    const result = analyzeTls(node({ security: "tls", sni: "a.com" }));
    expect(result.knownFingerprint).toBeNull();
  });
});

describe("analyzeTls — composition", () => {
  it("accepts a precomputed CompletenessResult and yields the same verdict", () => {
    const n = node({ security: "tls" });
    const selfComputed = analyzeTls(n);
    const passedIn = analyzeTls(n, analyzeCompleteness(n));
    expect(passedIn).toEqual(selfComputed);
  });
});
