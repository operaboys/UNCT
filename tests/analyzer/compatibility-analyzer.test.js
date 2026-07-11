/**
 * Compatibility Analyzer tests (06-ANALYZER_ENGINE §2.6, Phase 10).
 *
 * Covers:
 *  1. a baseline node (vless/tcp/none) reads compatible everywhere,
 *  2. Xray's well-documented absence of Hysteria2/TUIC support (false, not a
 *     guess) alongside v2rayNG's protocol-rollout uncertainty (null) for the
 *     very same node,
 *  3. the task's own canonical "نامشخص" example verbatim: Reality on v2rayNG
 *     is null while every other client reads true,
 *  4. kcp: a real true/false/null split across clients (Xray/v2rayNG true,
 *     sing-box-family false, NekoBox null — backend-ambiguous),
 *  5. quic: total uncertainty (every client AND every platform null) — Rule
 *     9's no-confident-data-anywhere case, not collapsed to a guess,
 *  6. Platform Compatibility is derived FROM Client Compatibility (an
 *     Android-only client contributes nothing to iOS, even when it is
 *     itself node-compatible).
 */
import { describe, it, expect } from "vitest";
import { analyzeCompatibility } from "../../core/analyzer/extended/compatibility-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", ...overrides,
  }));
}

describe("analyzeCompatibility — baseline (vless/tcp/none)", () => {
  it("reads compatible for every client and every platform", () => {
    const result = analyzeCompatibility(node());
    expect(result.clients).toEqual({
      xray: true, "sing-box": true, "clash-meta": true, nekobox: true, v2rayng: true, hiddify: true,
    });
    expect(result.platforms).toEqual({
      android: true, ios: true, windows: true, linux: true, macos: true,
    });
  });
});

describe("analyzeCompatibility — Hysteria2 client support (protocol-level)", () => {
  it("marks Xray incompatible (never implemented Hysteria2) and v2rayNG unknown (version-dependent rollout)", () => {
    const result = analyzeCompatibility(node({
      protocol: "hysteria2", sourceType: "hysteria2-url",
    }));
    expect(result.clients.xray).toBe(false);
    expect(result.clients.v2rayng).toBeNull();
    expect(result.clients["sing-box"]).toBe(true);
    expect(result.clients["clash-meta"]).toBe(true);
    expect(result.clients.nekobox).toBe(true);
    expect(result.clients.hiddify).toBe(true);
  });
});

describe("analyzeCompatibility — Reality on v2rayNG (the task's own نامشخص example)", () => {
  it("reads v2rayNG as unknown while every other client reads compatible", () => {
    const result = analyzeCompatibility(node({ security: "reality" }));
    expect(result.clients.v2rayng).toBeNull();
    expect(result.clients.xray).toBe(true);
    expect(result.clients["sing-box"]).toBe(true);
    expect(result.clients["clash-meta"]).toBe(true);
    expect(result.clients.nekobox).toBe(true);
    expect(result.clients.hiddify).toBe(true);
  });
});

describe("analyzeCompatibility — kcp transport (a real true/false/null split)", () => {
  it("Xray and v2rayNG support kcp, sing-box-family clients do not, NekoBox is backend-ambiguous", () => {
    const result = analyzeCompatibility(node({ network: "kcp" }));
    expect(result.clients.xray).toBe(true);
    expect(result.clients.v2rayng).toBe(true);
    expect(result.clients["sing-box"]).toBe(false);
    expect(result.clients["clash-meta"]).toBe(false);
    expect(result.clients.hiddify).toBe(false);
    expect(result.clients.nekobox).toBeNull();
  });
});

describe("analyzeCompatibility — quic transport (no confident data anywhere, Rule 9)", () => {
  it("never collapses total uncertainty into a guessed verdict: every client AND every platform is null", () => {
    const result = analyzeCompatibility(node({ network: "quic" }));
    for (const client of Object.keys(result.clients)) {
      expect(result.clients[/** @type {keyof typeof result.clients} */ (client)]).toBeNull();
    }
    for (const platform of Object.keys(result.platforms)) {
      expect(result.platforms[/** @type {keyof typeof result.platforms} */ (platform)]).toBeNull();
    }
  });
});

describe("analyzeCompatibility — Platform Compatibility is derived FROM Client Compatibility", () => {
  it("an Android-only client (NekoBox) contributes nothing to iOS, even though it is itself node-compatible", () => {
    const result = analyzeCompatibility(node());
    // NekoBox is node-compatible here (see the baseline test), but NekoBox
    // does not exist on iOS at all — iOS's true verdict must come from one
    // of the genuinely cross-platform clients (sing-box/Hiddify), not NekoBox.
    expect(result.clients.nekobox).toBe(true);
    expect(result.platforms.ios).toBe(true);
  });

  it("iOS reads false when every cross-platform client is incompatible and only Android-only clients remain", () => {
    // Xray's iOS availability is null (no official app, not a confident "no"),
    // so an Xray-compatible node would leak that null into iOS's verdict.
    // hysteria2+kcp avoids this: Xray is false at the protocol level (always,
    // regardless of network), and kcp makes sing-box/Clash Meta/Hiddify false
    // too — every iOS-relevant client is a confident false, so iOS itself
    // reads false (NekoBox/v2rayNG are already false on iOS by availability
    // alone, so they cannot inject a null either).
    const result = analyzeCompatibility(node({ protocol: "hysteria2", sourceType: "hysteria2-url", network: "kcp" }));
    expect(result.clients.xray).toBe(false);
    expect(result.clients["sing-box"]).toBe(false);
    expect(result.clients["clash-meta"]).toBe(false);
    expect(result.clients.hiddify).toBe(false);
    expect(result.platforms.ios).toBe(false);
  });
});
