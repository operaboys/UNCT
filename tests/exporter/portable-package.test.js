/**
 * Portable Project Package tests (08-EXPORT_ENGINE §7 — Backup/Snapshot).
 *
 * Tests the round-trip guarantee: exportPortablePackage → importPortablePackage
 * must restore all domain fields exactly. nodeId/createdAt/updatedAt are
 * intentionally regenerated (Rule 4 — system-generated, never from input).
 */

import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  exportPortablePackage, importPortablePackage, PORTABLE_PACKAGE_VERSION,
} from "../../core/exporter/portable-package.js";
import { createNode } from "../../core/unm/create-node.js";
import { UNM_SCHEMA_VERSION } from "../../core/unm/registry/schema-registry.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const vless = createNode({
  sourceType: "vless-url",
  protocol: "vless",
  address: "a.example.com",
  port: 443,
  uuid: "c3f5db00-1234-4abc-8def-abcdef012345",
  security: "tls",
  sni: "a.example.com",
  network: "ws",
  path: "/ws",
  metadata: { parser: "UrlParser", confidence: 95, warnings: [], errors: [], recoveryActions: [], originalMappings: {} },
});

const trojan = createNode({
  sourceType: "xray-json",
  protocol: "trojan",
  address: "b.example.com",
  port: 8443,
  password: "secret",
  security: "tls",
  network: "tcp",
});

// ── exportPortablePackage ─────────────────────────────────────────────────────

describe("exportPortablePackage", () => {
  it("returns a non-empty Uint8Array", () => {
    const { content } = exportPortablePackage([vless], { themeChoice: "dark", languageChoice: "en" });
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
  });

  it("works with an empty node list", () => {
    const { content } = exportPortablePackage([], {});
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
  });

  it("defaults themeChoice/languageChoice to 'auto' when not provided", () => {
    const { content } = exportPortablePackage([vless]);
    const { settings } = importPortablePackage(content);
    expect(settings.themeChoice).toBe("auto");
    expect(settings.languageChoice).toBe("auto");
  });
});

// ── importPortablePackage (manifest) ─────────────────────────────────────────

describe("manifest", () => {
  it("contains packageType=portable-project, version, date, nodeCount, unmVersion", () => {
    const { content } = exportPortablePackage([vless, trojan], { themeChoice: "light", languageChoice: "fa" });
    const { manifest } = importPortablePackage(content);
    expect(manifest.packageType).toBe("portable-project");
    expect(manifest.exportVersion).toBe(PORTABLE_PACKAGE_VERSION);
    expect(manifest.unmVersion).toBe(UNM_SCHEMA_VERSION);
    expect(manifest.nodeCount).toBe(2);
    expect(() => new Date(manifest.exportDate).toISOString()).not.toThrow();
  });
});

// ── Round-trip: nodes ─────────────────────────────────────────────────────────

describe("round-trip: nodes", () => {
  it("restores the same number of nodes", () => {
    const { content } = exportPortablePackage([vless, trojan], {});
    const { nodes } = importPortablePackage(content);
    expect(nodes.length).toBe(2);
  });

  it("restores all domain fields exactly", () => {
    const { content } = exportPortablePackage([vless], {});
    const { nodes } = importPortablePackage(content);
    const r = nodes[0];

    expect(r.sourceType).toBe(vless.sourceType);
    expect(r.protocol).toBe(vless.protocol);
    expect(r.address).toBe(vless.address);
    expect(r.port).toBe(vless.port);
    expect(r.uuid).toBe(vless.uuid);
    expect(r.security).toBe(vless.security);
    expect(r.sni).toBe(vless.sni);
    expect(r.network).toBe(vless.network);
    expect(r.path).toBe(vless.path);
  });

  it("restores metadata fields (parser, confidence, warnings)", () => {
    const { content } = exportPortablePackage([vless], {});
    const { nodes } = importPortablePackage(content);
    expect(nodes[0].metadata.parser).toBe("UrlParser");
    expect(nodes[0].metadata.confidence).toBe(95);
    expect(nodes[0].metadata.warnings).toEqual([]);
  });

  it("nodeId is REGENERATED (Rule 4 — system-generated, never from input)", () => {
    const { content } = exportPortablePackage([vless], {});
    const { nodes } = importPortablePackage(content);
    expect(nodes[0].nodeId).not.toBe(vless.nodeId);
    expect(typeof nodes[0].nodeId).toBe("string");
    expect(nodes[0].nodeId.length).toBeGreaterThan(0);
  });

  it("restored nodes are frozen (Immutable Rule 8)", () => {
    const { content } = exportPortablePackage([vless], {});
    const { nodes } = importPortablePackage(content);
    expect(Object.isFrozen(nodes[0])).toBe(true);
  });

  it("restores nodes with extensions (WireGuard)", () => {
    const wg = createNode({
      sourceType: "wireguard-config",
      protocol: "wireguard",
      address: "wg.example.com",
      port: 51820,
      extensions: {
        wireguard: { privateKey: "priv", publicKey: "pub", allowedIPs: ["10.0.0.2/32"] },
      },
    });
    const { content } = exportPortablePackage([wg], {});
    const { nodes } = importPortablePackage(content);
    expect(nodes[0].protocol).toBe("wireguard");
    expect(/** @type {any} */ (nodes[0].extensions)?.wireguard?.privateKey).toBe("priv");
  });

  it("skips corrupt/invalid node entries rather than throwing", () => {
    // Manually build a ZIP with one valid + one corrupt node
    const badPackage = exportPortablePackage([vless], {});
    // Corrupt by putting non-array nodes.json into a fresh portable ZIP
    const manifest = JSON.stringify({
      packageType: "portable-project",
      exportVersion: PORTABLE_PACKAGE_VERSION,
      exportDate: new Date().toISOString(),
      nodeCount: 2,
      unmVersion: UNM_SCHEMA_VERSION,
    });
    // One good node + one missing required field (no address)
    const badNodes = JSON.stringify([
      JSON.parse(JSON.stringify(vless)),
      { sourceType: "vless-url", protocol: "vless", port: 443 /* no address */ },
    ]);
    const corrupt = zipSync({
      "manifest.json": strToU8(manifest),
      "nodes.json": strToU8(badNodes),
      "settings.json": strToU8(JSON.stringify({ themeChoice: "auto", languageChoice: "auto" })),
    });
    const { nodes } = importPortablePackage(corrupt);
    // Only the valid node is restored
    expect(nodes.length).toBe(1);
    void badPackage; // suppress unused-var
  });
});

// ── Round-trip: settings ──────────────────────────────────────────────────────

describe("round-trip: settings", () => {
  it("restores themeChoice and languageChoice exactly", () => {
    const { content } = exportPortablePackage([vless], { themeChoice: "dark", languageChoice: "fa" });
    const { settings } = importPortablePackage(content);
    expect(settings.themeChoice).toBe("dark");
    expect(settings.languageChoice).toBe("fa");
  });

  it("defaults to 'auto' for missing keys in settings.json", () => {
    const partial = zipSync({
      "manifest.json": strToU8(JSON.stringify({
        packageType: "portable-project",
        exportVersion: PORTABLE_PACKAGE_VERSION,
        exportDate: new Date().toISOString(),
        nodeCount: 0,
        unmVersion: UNM_SCHEMA_VERSION,
      })),
      "nodes.json": strToU8("[]"),
      "settings.json": strToU8(JSON.stringify({ themeChoice: "light" /* no languageChoice */ })),
    });
    const { settings } = importPortablePackage(partial);
    expect(settings.themeChoice).toBe("light");
    expect(settings.languageChoice).toBe("auto");
  });
});

// ── importPortablePackage error cases ────────────────────────────────────────

describe("importPortablePackage errors", () => {
  it("throws on non-ZIP input", () => {
    expect(() => importPortablePackage(new Uint8Array([1, 2, 3]))).toThrow(/not a valid ZIP/);
  });

  it("throws when manifest.json is missing", () => {
    const bare = zipSync({ "nodes.json": strToU8("[]") });
    expect(() => importPortablePackage(bare)).toThrow(/missing manifest.json/);
  });

  it("throws when packageType is not 'portable-project'", () => {
    const wrongType = zipSync({
      "manifest.json": strToU8(JSON.stringify({
        packageType: "regular-zip",
        exportVersion: "1.0",
        exportDate: new Date().toISOString(),
        nodeCount: 0,
        unmVersion: UNM_SCHEMA_VERSION,
      })),
      "nodes.json": strToU8("[]"),
    });
    expect(() => importPortablePackage(wrongType)).toThrow(/packageType/);
  });

  it("throws when nodes.json is missing", () => {
    const noNodes = zipSync({
      "manifest.json": strToU8(JSON.stringify({
        packageType: "portable-project",
        exportVersion: PORTABLE_PACKAGE_VERSION,
        exportDate: new Date().toISOString(),
        nodeCount: 0,
        unmVersion: UNM_SCHEMA_VERSION,
      })),
    });
    expect(() => importPortablePackage(noNodes)).toThrow(/missing nodes.json/);
  });

  it("throws when nodes.json is not valid JSON", () => {
    const bad = zipSync({
      "manifest.json": strToU8(JSON.stringify({
        packageType: "portable-project",
        exportVersion: PORTABLE_PACKAGE_VERSION,
        exportDate: new Date().toISOString(),
        nodeCount: 0,
        unmVersion: UNM_SCHEMA_VERSION,
      })),
      "nodes.json": strToU8("NOT_JSON"),
    });
    expect(() => importPortablePackage(bad)).toThrow(/not valid JSON/);
  });

  it("throws when nodes.json is not an array", () => {
    const notArr = zipSync({
      "manifest.json": strToU8(JSON.stringify({
        packageType: "portable-project",
        exportVersion: PORTABLE_PACKAGE_VERSION,
        exportDate: new Date().toISOString(),
        nodeCount: 0,
        unmVersion: UNM_SCHEMA_VERSION,
      })),
      "nodes.json": strToU8(JSON.stringify({ nodes: [] })),
    });
    expect(() => importPortablePackage(notArr)).toThrow(/must contain an array/);
  });
});
