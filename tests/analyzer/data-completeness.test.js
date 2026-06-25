/**
 * Data Completeness Analyzer tests (06-ANALYZER_ENGINE §1.0).
 *
 * Covers the three guarantees of the module's strict scope:
 *  1. relevance is derived from protocol/security/network (not a fixed list),
 *  2. "missing" is about presence, never validity,
 *  3. completenessScore is the present/relevant percentage.
 */
import { describe, it, expect } from "vitest";
import { analyzeCompleteness, relevantFields } from "../../core/analyzer/core/data-completeness.js";
import { createNode } from "../../core/unm/create-node.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", ...overrides,
  }));
}

describe("relevantFields — relevance is protocol/security/network driven", () => {
  it("a plain VLESS over tcp+none only needs its uuid + encryption", () => {
    expect(relevantFields(node({ protocol: "vless", security: "none", network: "tcp" })))
      .toEqual(["uuid", "encryption"]);
  });

  it("adds sni/alpn/fingerprint once security is tls", () => {
    expect(relevantFields(node({ security: "tls" })))
      .toEqual(["uuid", "encryption", "sni", "alpn", "fingerprint", "flow"]);
  });

  it("adds pbk/sid (on top of the tls set) once security is reality", () => {
    const fields = relevantFields(node({ security: "reality" }));
    expect(fields).toEqual(expect.arrayContaining(["sni", "alpn", "fingerprint", "pbk", "sid", "flow"]));
  });

  it("uses password (not uuid) for trojan, and method for shadowsocks", () => {
    expect(relevantFields(node({ protocol: "trojan", sourceType: "trojan-url" })))
      .toContain("password");
    expect(relevantFields(node({ protocol: "trojan", sourceType: "trojan-url" })))
      .not.toContain("uuid");

    const ss = relevantFields(node({ protocol: "shadowsocks", sourceType: "ss-url" }));
    expect(ss).toEqual(expect.arrayContaining(["password", "method"]));
  });

  it("adds host/path for ws and serviceName for grpc", () => {
    expect(relevantFields(node({ network: "ws" }))).toEqual(expect.arrayContaining(["host", "path"]));
    expect(relevantFields(node({ network: "grpc" }))).toEqual(expect.arrayContaining(["path", "serviceName"]));
    expect(relevantFields(node({ network: "grpc" }))).not.toContain("host");
  });

  it("does not mark vless flow relevant without a TLS-layer security", () => {
    expect(relevantFields(node({ security: "none" }))).not.toContain("flow");
    expect(relevantFields(node({ security: "reality" }))).toContain("flow");
  });
});

describe("analyzeCompleteness — present vs missing, and the score", () => {
  it("splits relevant fields into present vs missing by presence only", () => {
    const result = analyzeCompleteness(node({
      security: "reality",
      uuid: "b831381d-6324-4d53-ad4f-8cda48b30811",
      encryption: "none",
      sni: "www.microsoft.com",
      pbk: "PUBKEY",
      // alpn, fingerprint, sid, flow intentionally absent
    }));
    expect(result.presentOptionalFields).toEqual(expect.arrayContaining(["uuid", "encryption", "sni", "pbk"]));
    expect(result.missingFields).toEqual(expect.arrayContaining(["alpn", "fingerprint", "sid", "flow"]));
  });

  it("counts an EMPTY string / whitespace / empty array as missing, not present", () => {
    const result = analyzeCompleteness(node({
      security: "tls",
      uuid: "b831381d-6324-4d53-ad4f-8cda48b30811",
      sni: "   ",      // whitespace only -> absent
      alpn: [],        // empty array -> absent
      fingerprint: "", // empty string -> absent
    }));
    expect(result.missingFields).toEqual(expect.arrayContaining(["sni", "alpn", "fingerprint"]));
    expect(result.presentOptionalFields).not.toContain("sni");
  });

  it("never judges validity — a present-but-garbage value still counts as present", () => {
    // A clearly INVALID uuid is still 'present' here; validity is spec 04's job.
    const result = analyzeCompleteness(node({ uuid: "not-a-real-uuid", encryption: "none" }));
    expect(result.presentOptionalFields).toContain("uuid");
    expect(result.missingFields).not.toContain("uuid");
  });

  it("completenessScore is round(present / relevant * 100)", () => {
    // tls vless: relevant = uuid, encryption, sni, alpn, fingerprint, flow (6).
    // present 3 of 6 -> 50.
    const result = analyzeCompleteness(node({
      security: "tls",
      uuid: "b831381d-6324-4d53-ad4f-8cda48b30811",
      encryption: "none",
      sni: "example.com",
    }));
    expect(relevantFields(node({ security: "tls" }))).toHaveLength(6);
    expect(result.completenessScore).toBe(50);
  });

  it("scores 100 when every relevant field is filled in", () => {
    const result = analyzeCompleteness(node({
      uuid: "b831381d-6324-4d53-ad4f-8cda48b30811",
      encryption: "none",
    }));
    expect(result.missingFields).toEqual([]);
    expect(result.completenessScore).toBe(100);
  });

  it("scores 100 (vacuously complete) when no optional field is relevant", () => {
    // wireguard over tcp+none: no uuid/password/tls/transport optional field applies.
    const result = analyzeCompleteness(node({
      protocol: "wireguard", sourceType: "wireguard-config", security: "none", network: "tcp",
    }));
    expect(result.missingFields).toEqual([]);
    expect(result.presentOptionalFields).toEqual([]);
    expect(result.completenessScore).toBe(100);
  });
});
