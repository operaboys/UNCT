/**
 * JSON Export tests (08-EXPORT_ENGINE §3, ADR-004) for all four variants:
 * Xray JSON / Sing-box JSON (batched outbounds, reusing `to-xray.js`/
 * `to-singbox.js` via `convertBatch`) and Normalized JSON / Analysis JSON
 * (direct, lossless `JSON.stringify` — no re-derivation).
 */
import { describe, it, expect } from "vitest";
import {
  exportXrayJson, exportSingboxJson, exportNormalizedJson, exportAnalysisJson,
} from "../../core/exporter/to-json.js";
import { toXray } from "../../core/converter/to-xray.js";
import { toSingBox } from "../../core/converter/to-singbox.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
});
const vmess = createNode({
  sourceType: "vmess-url", protocol: "vmess", address: "b.example.com", port: 443, uuid: "uuid-2",
});
const wireguard = createNode({
  sourceType: "wireguard-config", protocol: "wireguard", address: "c.example.com", port: 51820,
  extensions: { wireguard: { privateKey: "priv", publicKey: "pub", allowedIPs: ["10.0.0.2/32"] } },
});

describe("exportXrayJson", () => {
  it("merges each node's single outbound into one multi-outbound config (matches toXray per node)", () => {
    const { content, skipped } = exportXrayJson([vless, vmess]);
    expect(JSON.parse(content)).toEqual({
      outbounds: [JSON.parse(toXray(vless)).outbounds[0], JSON.parse(toXray(vmess)).outbounds[0]],
    });
    expect(skipped).toEqual([]);
  });

  it("skips (never throws on) a node outside to-xray's 4-protocol scope, e.g. wireguard", () => {
    const { content, skipped } = exportXrayJson([vless, wireguard]);
    expect(JSON.parse(content).outbounds).toHaveLength(1);
    expect(skipped).toEqual([
      { nodeId: wireguard.nodeId, protocol: "wireguard", reason: 'protocol "wireguard" is not supported by Xray JSON export' },
    ]);
  });
});

describe("exportSingboxJson", () => {
  it("merges each node's single outbound into one multi-outbound config (matches toSingBox per node, all 7 protocols)", () => {
    const { content, skipped } = exportSingboxJson([vless, wireguard]);
    expect(JSON.parse(content)).toEqual({
      outbounds: [JSON.parse(toSingBox(vless)).outbounds[0], JSON.parse(toSingBox(wireguard)).outbounds[0]],
    });
    expect(skipped).toEqual([]);
  });
});

describe("exportNormalizedJson", () => {
  it("round-trips the UNMNode array losslessly (08 §1's Round-Trip requirement)", () => {
    const content = exportNormalizedJson([vless, vmess]);
    expect(JSON.parse(content)).toEqual([vless, vmess]);
  });

  it("returns an empty array for an empty node list", () => {
    expect(exportNormalizedJson([])).toBe("[]");
  });
});

describe("exportAnalysisJson", () => {
  it("serializes the Analyzer's verdict bundles verbatim, keyed by nodeId", () => {
    const analysisByNodeId = /** @type {any} */ ({ [vless.nodeId]: { security: { securityScore: 80, issues: [] } } });
    expect(JSON.parse(exportAnalysisJson(analysisByNodeId))).toEqual(analysisByNodeId);
  });

  it("returns an empty object for no analyzed nodes", () => {
    expect(exportAnalysisJson({})).toBe("{}");
  });
});
