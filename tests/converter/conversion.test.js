/**
 * ConversionObject builder + Batch Conversion tests (Converter Engine,
 * Phase 7 Item 5, ADR-012).
 *
 * Two concerns, mirrored from the ADR's own two guarantees:
 *  1. `buildConversion(node)` answers the capability question correctly for
 *     all 7 UNM protocols, matching the per-converter scope table ADR-012
 *     derived from each serializer's own SUPPORTED_PROTOCOLS — most notably
 *     the to-xray 4-protocol asymmetry (hysteria2/tuic/wireguard ->
 *     `canExportAsXrayJson: false`, everything else `true`).
 *  2. `convertBatch`/`convertNode` actually dispatch to the real serializers
 *     (proving real conversion, not a stub) and never throw on a
 *     format-incompatible node — it lands in `skipped` instead.
 */
import { describe, it, expect } from "vitest";
import { buildConversion, convertNode, convertBatch } from "../../core/converter/conversion.js";
import { toClash } from "../../core/converter/to-clash.js";
import { createNode } from "../../core/unm/create-node.js";

/** One minimal, valid node per UNM protocol. @type {Record<string, any>} */
const NODES = {
  vless: createNode({
    sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
  }),
  vmess: createNode({
    sourceType: "vmess-url", protocol: "vmess", address: "b.example.com", port: 443, uuid: "uuid-2",
  }),
  trojan: createNode({
    sourceType: "trojan-url", protocol: "trojan", address: "c.example.com", port: 443, password: "pw",
  }),
  shadowsocks: createNode({
    sourceType: "ss-url", protocol: "shadowsocks", address: "d.example.com", port: 8388,
    method: "aes-256-gcm", password: "pw2",
  }),
  hysteria2: createNode({
    sourceType: "hysteria2-url", protocol: "hysteria2", address: "e.example.com", port: 443, password: "pw3",
  }),
  tuic: createNode({
    sourceType: "tuic-url", protocol: "tuic", address: "f.example.com", port: 443,
    uuid: "uuid-3", password: "pw4",
  }),
  wireguard: createNode({
    sourceType: "wireguard-config", protocol: "wireguard", address: "g.example.com", port: 51820,
    extensions: { wireguard: { privateKey: "priv", publicKey: "pub", allowedIPs: ["10.0.0.2/32"] } },
  }),
};

describe("buildConversion — capability matrix (ADR-012)", () => {
  it("all four flags are true for vless/vmess/trojan/shadowsocks (every converter supports them)", () => {
    for (const protocol of ["vless", "vmess", "trojan", "shadowsocks"]) {
      expect(buildConversion(NODES[protocol])).toEqual({
        canExportAsUrl: true, canExportAsXrayJson: true,
        canExportAsSingboxJson: true, canExportAsClashYaml: true,
      });
    }
  });

  it("canExportAsXrayJson is false for hysteria2/tuic/wireguard (to-xray's 4-protocol limit), others stay true", () => {
    for (const protocol of ["hysteria2", "tuic", "wireguard"]) {
      expect(buildConversion(NODES[protocol])).toEqual({
        canExportAsUrl: true, canExportAsXrayJson: false,
        canExportAsSingboxJson: true, canExportAsClashYaml: true,
      });
    }
  });

  it("is a static lookup — never calls a serializer (a protocol outside the UNM enum throws nowhere)", () => {
    const fake = /** @type {any} */ ({ protocol: "made-up" });
    expect(() => buildConversion(fake)).not.toThrow();
    expect(buildConversion(fake)).toEqual({
      canExportAsUrl: false, canExportAsXrayJson: false,
      canExportAsSingboxJson: false, canExportAsClashYaml: false,
    });
  });
});

describe("convertNode — single-node dispatch", () => {
  it("delegates to the real serializer (matches calling toClash directly)", () => {
    expect(convertNode(NODES.vless, "clashYaml")).toBe(toClash(NODES.vless));
  });

  it("propagates the underlying serializer's CONVERT_UNSUPPORTED for an out-of-scope protocol", () => {
    expect(() => convertNode(NODES.wireguard, "xrayJson")).toThrow(/CONVERT_UNSUPPORTED/);
  });

  it("throws for an unknown format key", () => {
    expect(() => convertNode(NODES.vless, /** @type {any} */ ("made-up-format"))).toThrow(/CONVERT_UNSUPPORTED/);
  });
});

describe("convertBatch — Batch Conversion (02 §7 fifth Converter output)", () => {
  it("converts every node when the target format supports all of them", () => {
    const nodes = [NODES.vless, NODES.shadowsocks, NODES.wireguard];
    const { converted, skipped } = convertBatch(nodes, "clashYaml");
    expect(skipped).toEqual([]);
    expect(converted).toHaveLength(3);
    expect(converted.map((c) => c.nodeId)).toEqual(nodes.map((n) => n.nodeId));
    expect(converted[0].output).toBe(toClash(NODES.vless));
  });

  it("skips (never throws on) nodes outside the target format's scope, e.g. wireguard against xrayJson", () => {
    const nodes = [NODES.vless, NODES.wireguard, NODES.tuic];
    const { converted, skipped } = convertBatch(nodes, "xrayJson");
    expect(converted.map((c) => c.nodeId)).toEqual([NODES.vless.nodeId]);
    expect(skipped).toEqual([
      { nodeId: NODES.wireguard.nodeId, protocol: "wireguard" },
      { nodeId: NODES.tuic.nodeId, protocol: "tuic" },
    ]);
  });

  it("throws for an unknown format key", () => {
    expect(() => convertBatch([NODES.vless], /** @type {any} */ ("made-up-format"))).toThrow(/CONVERT_UNSUPPORTED/);
  });

  it("returns empty converted/skipped for an empty node list", () => {
    expect(convertBatch([], "url")).toEqual({ converted: [], skipped: [] });
  });
});
