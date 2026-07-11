/**
 * Reality Analyzer tests (06-ANALYZER_ENGINE §1.5).
 *
 * Covers:
 *  1. security !== "reality" => not applicable; stray pbk/sid is incoherent,
 *  2. reality => pbk presence/plausibility (via Data Completeness) + sid,
 *  3. reality consumes TLS Analyzer's coherence (sni) verbatim,
 *  4. Reality-specific tightening: missing fingerprint IS an issue here, even
 *     though TLS Analyzer leaves it as a non-issue (knownFingerprint: null),
 *  5. boundaries: validity (spec 04) and securityScore (§1.2) are NOT this
 *     module's,
 *  6. the precomputed completeness/tls path matches the self-computed one.
 */
import { describe, it, expect } from "vitest";
import { analyzeReality } from "../../core/analyzer/core/reality-analyzer.js";
import { analyzeCompleteness } from "../../core/analyzer/core/data-completeness.js";
import { analyzeTls } from "../../core/analyzer/core/tls-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

const VALID_PBK = "X".repeat(43); // 43-char base64url-shaped placeholder
const VALID_SID = "ab12";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", ...overrides,
  }));
}

describe("analyzeReality — security !== 'reality' (no Reality layer)", () => {
  it("is not applicable and compatible when no pbk/sid is set", () => {
    const result = analyzeReality(node({ security: "tls" }));
    expect(result).toMatchObject({
      applicable: false, compatible: true, pbkPlausible: null, sidPlausible: null,
    });
    expect(result.issues).toEqual([]);
  });

  it("flags a stray pbk/sid set on a non-reality node as incompatible", () => {
    const result = analyzeReality(node({ security: "tls", pbk: VALID_PBK, sid: VALID_SID }));
    expect(result.applicable).toBe(false);
    expect(result.compatible).toBe(false);
    expect(result.issues.join(" ")).toContain("pbk");
    expect(result.issues.join(" ")).toContain("sid");
  });
});

describe("analyzeReality — security 'reality' (Reality layer present)", () => {
  it("is compatible for a fully well-formed reality node", () => {
    const result = analyzeReality(node({
      security: "reality", sni: "www.microsoft.com", fingerprint: "chrome",
      pbk: VALID_PBK, sid: VALID_SID,
    }));
    expect(result).toMatchObject({ applicable: true, compatible: true, pbkPlausible: true, sidPlausible: true });
    expect(result.issues).toEqual([]);
  });

  it("flags a missing pbk (consuming Data Completeness missingFields)", () => {
    const result = analyzeReality(node({
      security: "reality", sni: "www.microsoft.com", fingerprint: "chrome",
    })); // no pbk
    expect(result.applicable).toBe(true);
    expect(result.compatible).toBe(false);
    expect(result.pbkPlausible).toBeNull();
    expect(result.issues.join(" ")).toContain("pbk is missing");
  });

  it("flags an implausible pbk format", () => {
    const result = analyzeReality(node({
      security: "reality", sni: "a.com", fingerprint: "chrome", pbk: "too-short",
    }));
    expect(result.pbkPlausible).toBe(false);
    expect(result.compatible).toBe(false);
    expect(result.issues.join(" ")).toContain("not a plausible X25519 public key");
  });

  it("treats a missing sid as fine (optional — no short ID restriction)", () => {
    const result = analyzeReality(node({
      security: "reality", sni: "a.com", fingerprint: "chrome", pbk: VALID_PBK,
    })); // no sid
    expect(result.sidPlausible).toBeNull();
    expect(result.compatible).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("flags an implausible sid format (odd-length hex)", () => {
    const result = analyzeReality(node({
      security: "reality", sni: "a.com", fingerprint: "chrome", pbk: VALID_PBK, sid: "abc",
    }));
    expect(result.sidPlausible).toBe(false);
    expect(result.compatible).toBe(false);
    expect(result.issues.join(" ")).toContain("not a plausible Reality short ID");
  });

  it("consumes TLS Analyzer's coherence verdict for a missing SNI", () => {
    const result = analyzeReality(node({
      security: "reality", fingerprint: "chrome", pbk: VALID_PBK,
    })); // no sni
    expect(result.compatible).toBe(false);
    expect(result.issues.join(" ")).toContain("sni is missing");
  });

  it("raises its OWN issue for a missing fingerprint, unlike TLS Analyzer", () => {
    const tlsResult = analyzeTls(node({ security: "reality", sni: "a.com", pbk: VALID_PBK }));
    expect(tlsResult.knownFingerprint).toBeNull();
    expect(tlsResult.coherent).toBe(true); // TLS Analyzer: no issue for absent fingerprint

    const realityResult = analyzeReality(node({ security: "reality", sni: "a.com", pbk: VALID_PBK }));
    expect(realityResult.compatible).toBe(false);
    expect(realityResult.issues.join(" ")).toContain("fingerprint is missing");
  });

  it("does not let PBK/SID change TLS Analyzer's own verdict (boundary check)", () => {
    // sni/fingerprint issues come ONLY from the consumed TLS result.
    const result = analyzeReality(node({
      security: "reality", sni: "a.com", fingerprint: "nope-browser", pbk: VALID_PBK,
    }));
    expect(result.issues.join(" ")).toContain("not a recognized uTLS profile");
  });
});

describe("analyzeReality — composition", () => {
  it("accepts precomputed completeness/tls and yields the same verdict", () => {
    const n = node({ security: "reality", sni: "a.com", fingerprint: "chrome", pbk: VALID_PBK, sid: VALID_SID });
    const selfComputed = analyzeReality(n);
    const completeness = analyzeCompleteness(n);
    const tls = analyzeTls(n, completeness);
    const passedIn = analyzeReality(n, completeness, tls);
    expect(passedIn).toEqual(selfComputed);
  });
});
