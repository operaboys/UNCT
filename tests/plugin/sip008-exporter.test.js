/**
 * Unit tests for the SIP008 Custom Exporter plugin
 * (plugins/sip008-exporter/index.js) — the Phase 11 Blocked-item
 * resolution's first real, non-fictional Custom Exporter (the remaining
 * half of ULTIMATE_BLUEPRINT_INDEX.md P12-13's condition).
 */
import { describe, it, expect } from "vitest";
import { createNode } from "../../core/unm/create-node.js";
import { sip008Exporter } from "../../plugins/sip008-exporter/index.js";
import { sip008Parser } from "../../plugins/sip008-parser/index.js";
import { normalizeAll } from "../../core/parser/factory.js";

/** @param {Record<string, unknown>} [overrides] */
function ssNode(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "ss-url", protocol: "shadowsocks", address: "ss.example.com", port: 8388,
    password: "ss-password", method: "aes-256-gcm",
    ...overrides,
  }));
}

/** @param {Record<string, unknown>} [overrides] */
function vlessNode(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "vl.example.com", port: 443,
    uuid: "b831381d-6324-4d53-ad4f-8cda48b30811",
    ...overrides,
  }));
}

describe("sip008Exporter — ExporterPlugin contract", () => {
  it("implements the required export() method and carries advisory hints", () => {
    expect(typeof sip008Exporter.export).toBe("function");
    expect(sip008Exporter.label).toBe("SIP008 (Shadowsocks JSON)");
    expect(sip008Exporter.mimeType).toBe("application/json");
    expect(sip008Exporter.extension).toBe("json");
  });
});

describe("sip008Exporter.export — real Shadowsocks nodes", () => {
  it("produces a valid {version, servers[]} SIP008 document", () => {
    const nodes = [
      ssNode({ address: "server1.example.com", port: 8888, password: "example-password-1", method: "aes-256-gcm", remark: "Example Server 1" }),
      ssNode({ address: "192.0.2.1", port: 443, password: "example-password-2", method: "chacha20-ietf-poly1305" }),
    ];
    const { content, skipped } = sip008Exporter.export(nodes);
    expect(skipped).toEqual([]);

    const doc = JSON.parse(content);
    expect(doc.version).toBe(1);
    expect(doc.servers).toHaveLength(2);
    expect(doc.servers[0]).toMatchObject({
      id: "1", remarks: "Example Server 1",
      server: "server1.example.com", server_port: 8888,
      password: "example-password-1", method: "aes-256-gcm",
    });
    expect(doc.servers[1]).toMatchObject({
      server: "192.0.2.1", server_port: 443,
      password: "example-password-2", method: "chacha20-ietf-poly1305",
    });
  });

  it("defaults remarks to an empty string when node.remark is unset", () => {
    const { content } = sip008Exporter.export([ssNode()]);
    expect(JSON.parse(content).servers[0].remarks).toBe("");
  });
});

describe("sip008Exporter.export — skip behavior (Export Anything, Lose Nothing)", () => {
  it("skips non-shadowsocks nodes with a clear reason", () => {
    const vless = vlessNode();
    const { content, skipped } = sip008Exporter.export([ssNode(), vless]);
    expect(JSON.parse(content).servers).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].nodeId).toBe(vless.nodeId);
    expect(skipped[0].reason).toMatch(/only represents the Shadowsocks protocol/);
  });

  it("skips a shadowsocks node missing method or password", () => {
    const missingMethod = createNode(/** @type {any} */ ({
      sourceType: "ss-url", protocol: "shadowsocks", address: "a.example.com", port: 8388, password: "p",
    }));
    const missingPassword = createNode(/** @type {any} */ ({
      sourceType: "ss-url", protocol: "shadowsocks", address: "b.example.com", port: 8388, method: "aes-256-gcm",
    }));
    const { content, skipped } = sip008Exporter.export([missingMethod, missingPassword]);
    expect(JSON.parse(content).servers).toHaveLength(0);
    expect(skipped).toHaveLength(2);
    expect(skipped[0].reason).toMatch(/missing "method"/);
    expect(skipped[1].reason).toMatch(/missing "password"/);
  });

  it("returns an empty servers array (not an error) for an all-skipped batch", () => {
    const { content, skipped } = sip008Exporter.export([vlessNode()]);
    expect(JSON.parse(content)).toEqual({ version: 1, servers: [] });
    expect(skipped).toHaveLength(1);
  });
});

describe("sip008Exporter <-> sip008Parser — real round-trip", () => {
  it("re-parsing exported SIP008 content reproduces the same shadowsocks nodes", () => {
    const original = [
      ssNode({ address: "server1.example.com", port: 8888, password: "pw-1", method: "aes-256-gcm", remark: "Node One" }),
      ssNode({ address: "203.0.113.5", port: 9999, password: "pw-2", method: "chacha20-ietf-poly1305", remark: "Node Two" }),
    ];
    const { content } = sip008Exporter.export(original);

    expect(sip008Parser.detect(content)).toBeGreaterThanOrEqual(90);
    const extraction = sip008Parser.parse(content);
    const reparsed = normalizeAll(sip008Parser, extraction);

    expect(reparsed).toHaveLength(2);
    expect(reparsed[0].protocol).toBe("shadowsocks");
    expect(reparsed[0].address).toBe("server1.example.com");
    expect(reparsed[0].port).toBe(8888);
    expect(reparsed[0].password).toBe("pw-1");
    expect(reparsed[0].method).toBe("aes-256-gcm");
    expect(reparsed[0].remark).toBe("Node One");
    expect(reparsed[1].address).toBe("203.0.113.5");
    expect(reparsed[1].remark).toBe("Node Two");
  });
});
