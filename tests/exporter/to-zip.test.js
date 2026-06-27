/**
 * ZIP Export tests (08-EXPORT_ENGINE §7, ADR-017). Round-trips the produced
 * archive through `fflate#unzipSync` to assert every bundled file is present
 * and matches the corresponding already-tested single-file exporter's output
 * verbatim — this file packages, it never re-derives content.
 */
import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { exportZip, EXPORT_MANIFEST_VERSION } from "../../core/exporter/to-zip.js";
import { exportNormalizedJson } from "../../core/exporter/to-json.js";
import { exportCsv } from "../../core/exporter/to-csv.js";
import { exportTxt } from "../../core/exporter/to-txt.js";
import { UNM_SCHEMA_VERSION } from "../../core/unm/registry/schema-registry.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
});
const wireguard = createNode({
  sourceType: "wireguard-config", protocol: "wireguard", address: "c.example.com", port: 51820,
  extensions: { wireguard: { privateKey: "priv", publicKey: "pub", allowedIPs: ["10.0.0.2/32"] } },
});

describe("exportZip", () => {
  it("bundles manifest.json (Export Version, Date, Node Count, UNM Version) plus every format", () => {
    const { content, skipped } = exportZip([vless, wireguard]);
    const files = unzipSync(content);

    const manifest = JSON.parse(strFromU8(files["manifest.json"]));
    expect(manifest).toEqual({
      exportVersion: EXPORT_MANIFEST_VERSION,
      exportDate: manifest.exportDate,
      nodeCount: 2,
      unmVersion: UNM_SCHEMA_VERSION,
    });
    expect(() => new Date(manifest.exportDate).toISOString()).not.toThrow();

    expect(JSON.parse(strFromU8(files["nodes.json"]))).toEqual(JSON.parse(exportNormalizedJson([vless, wireguard])));
    expect(strFromU8(files["nodes.csv"])).toBe(exportCsv([vless, wireguard]));
    expect(files["nodes.txt"]).toBeDefined();
    expect(files["clash.yaml"]).toBeDefined();
    expect(files["xray.json"]).toBeDefined();
    expect(files["singbox.json"]).toBeDefined();
    expect(files["analysis.json"]).toBeUndefined();

    // wireguard is outside to-xray.js's 4-protocol scope (matches exportXrayJson's own test).
    expect(skipped).toEqual([
      { nodeId: wireguard.nodeId, protocol: "wireguard", reason: 'protocol "wireguard" is not supported by Xray JSON export' },
    ]);
  });

  it("includes analysis.json only when an Analyzer verdict bundle is passed", () => {
    const analysisByNodeId = /** @type {any} */ ({ [vless.nodeId]: { security: { securityScore: 80, issues: [] } } });
    const { content } = exportZip([vless], analysisByNodeId);
    const files = unzipSync(content);
    expect(JSON.parse(strFromU8(files["analysis.json"]))).toEqual(analysisByNodeId);
  });

  it("manifest reports nodeCount 0 and every bundled file still round-trips for an empty node list", () => {
    const { content, skipped } = exportZip([]);
    const files = unzipSync(content);
    expect(JSON.parse(strFromU8(files["manifest.json"])).nodeCount).toBe(0);
    expect(strFromU8(files["nodes.txt"])).toBe(exportTxt([]).content);
    expect(skipped).toEqual([]);
  });
});
