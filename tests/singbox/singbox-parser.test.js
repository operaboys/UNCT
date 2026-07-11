import { describe, it, expect } from "vitest";
import {
  singboxParser, registerSingBoxParser, detectSingBox, parseSingBox,
  collectItems, normalizeItem, normalizeManySingBox, recoverSingBox,
} from "../../core/parser/singbox/index.js";
import { createParserFactory, normalizeAll } from "../../core/parser/factory.js";
import { registerXrayParser } from "../../core/parser/xray/index.js";
import { registerUrlParser } from "../../core/parser/url/index.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import {
  MULTI, SINGLE_VMESS, ENDPOINTS_WG, BROKEN, MISSING_SERVER, NO_PROXY, UUID,
} from "./fixtures.js";

describe("SingBoxParser — BaseParser contract (multi-node, ADR-008)", () => {
  it("implements the required methods and declares producesMany", () => {
    for (const m of ["detect", "parse", "validateStructure", "normalize", "recover"]) {
      expect(typeof (/** @type {any} */ (singboxParser)[m])).toBe("function");
    }
    expect(singboxParser.producesMany).toBe(true);
    expect(typeof singboxParser.normalizeMany).toBe("function");
  });
  it("normalize() refuses (no silent data loss, Rule 9)", () => {
    expect(() => singboxParser.normalize(parseSingBox(SINGLE_VMESS)))
      .toThrow(/normalizeMany|ANTI_CHAOS Rule 9|ADR-008/);
  });
});

describe("SingBoxParser.detect (Stage 02, disambiguated from Xray)", () => {
  it("scores a sing-box config highly", () => {
    expect(detectSingBox(MULTI)).toBe(95);
  });
  it("scores an Xray-shaped config 0 (uses protocol/settings, not type/server)", () => {
    const xrayish = JSON.stringify({ outbounds: [{ protocol: "vless", settings: { vnext: [] }, streamSettings: {} }] });
    expect(detectSingBox(xrayish)).toBe(0);
  });
  it("gives a recoverable score to broken sing-box JSON", () => {
    expect(detectSingBox(BROKEN)).toBe(60);
  });
  it("rejects URLs and non-JSON", () => {
    expect(detectSingBox("vless://x@y:443")).toBe(0);
    expect(detectSingBox("")).toBe(0);
  });
});

describe("SingBoxParser — collection skips non-proxy outbounds", () => {
  it("collects only proxy outbounds/endpoints", () => {
    expect(collectItems(JSON.parse(MULTI))).toHaveLength(4);
    expect(collectItems(JSON.parse(NO_PROXY))).toHaveLength(0);
  });
});

describe("SingBoxParser — multi-node expansion (Stage 05 + ADR-008)", () => {
  const nodes = normalizeManySingBox(parseSingBox(MULTI));

  it("produces one node per proxy outbound", () => {
    expect(nodes.map((n) => n.protocol)).toEqual(["vless", "shadowsocks", "trojan", "wireguard"]);
    expect(nodes.every((n) => n.sourceType === "singbox-json")).toBe(true);
  });
  it("normalizes the VLESS+Reality node and records sing-box synonym mappings", () => {
    const vless = nodes[0];
    expect(vless.network).toBe("grpc");
    expect(vless.security).toBe("reality");
    expect(vless.uuid).toBe(UUID);
    expect(vless.pbk).toBe("PUB123");
    expect(vless.sid).toBe("ab12");
    expect(vless.sni).toBe("sni.example.com");
    expect(vless.fingerprint).toBe("chrome");
    expect(vless.serviceName).toBe("gsvc");
    expect(vless.metadata.originalMappings).toMatchObject({
      public_key: "pbk", short_id: "sid", server_name: "sni",
    });
  });
  it("derives security from tls.enabled / reality.enabled (no string field)", () => {
    expect(nodes[1].security).toBe("none"); // shadowsocks, no tls
    expect(nodes[2].security).toBe("tls"); // trojan tls.enabled
  });
  it("routes WireGuard keys to extensions.wireguard (ADR-007), never the core node", () => {
    const wg = nodes[3];
    expect(/** @type {any} */ (wg).publicKey).toBeUndefined();
    expect(wg.extensions?.wireguard).toEqual({
      privateKey: "PRIVKEY", publicKey: "PEERKEY", presharedKey: "PSK",
      mtu: 1420, allowedIPs: ["10.0.0.2/32", "fd00::2/128"],
    });
  });
  it("every produced node validates through the Validation Engine", () => {
    for (const node of nodes) {
      expect(applyValidation(node).validation.overallValid).toBe(true);
    }
  });
});

describe("SingBoxParser — transports and endpoints", () => {
  it("maps a single vmess+ws outbound", () => {
    const [node] = normalizeManySingBox(parseSingBox(SINGLE_VMESS));
    expect(node.protocol).toBe("vmess");
    expect(node.network).toBe("ws");
    expect(node.security).toBe("tls");
    expect(node.path).toBe("/v");
    expect(node.host).toBe("vm.example.com");
  });
  it("reads WireGuard from the modern endpoints[] array", () => {
    const [node] = normalizeManySingBox(parseSingBox(ENDPOINTS_WG));
    expect(node.protocol).toBe("wireguard");
    expect(node.extensions?.wireguard).toMatchObject({ privateKey: "EPRIV", publicKey: "EPEER", mtu: 1280 });
  });
});

describe("SingBoxParser — never fabricates, skips un-buildable items (Rule 9 safe)", () => {
  it("an outbound missing its server yields no node; the valid sibling still parses", () => {
    const nodes = normalizeManySingBox(parseSingBox(MISSING_SERVER));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].address).toBe("ok.example.com");
  });
  it("normalizeItem throws on a missing server (no fabrication)", () => {
    expect(() => normalizeItem({ type: "vless", server_port: 443 })).toThrow(/PARSE_MISSING_REQUIRED/);
  });
});

describe("SingBoxParser — parse() failure routing + recovery (Stage 10)", () => {
  it("throws on malformed JSON and on no proxy item", () => {
    expect(() => parseSingBox(BROKEN)).toThrow(/PARSE_MISSING_REQUIRED/);
    expect(() => parseSingBox(NO_PROXY)).toThrow(/PARSE_MISSING_REQUIRED/);
  });
  it("recovers broken JSON (comments + trailing commas)", () => {
    const extraction = recoverSingBox(BROKEN);
    expect(extraction).not.toBeNull();
    const nodes = normalizeManySingBox(/** @type {any} */ (extraction));
    expect(nodes[0].address).toBe("rec.example.com");
    expect(/** @type {any} */ (extraction).recoveryActions.some((/** @type {string} */ a) => a.startsWith("REC_STRUCTURE_REPAIRED"))).toBe(true);
  });
  it("returns null when JSON cannot be repaired", () => {
    expect(recoverSingBox("{ not ::: json")).toBeNull();
    expect(recoverSingBox("")).toBeNull();
  });
});

describe("SingBoxParser — advisory hints + validateStructure", () => {
  it("exposes advisory-only hints", () => {
    expect(singboxParser.formatVersion?.()).toBe("singbox-json");
    expect(singboxParser.metadataHint?.()).toEqual({ parser: "SingBoxParser" });
  });
  it("validateStructure passes when items exist, fails when empty", () => {
    expect(singboxParser.validateStructure(parseSingBox(MULTI)).overallValid).toBe(true);
    expect(singboxParser.validateStructure({ fields: { items: [] } }).overallValid).toBe(false);
  });
});

describe("SingBoxParser — end-to-end through ParserFactory", () => {
  it("is selected over Xray for a sing-box config and expands via normalizeAll", () => {
    const factory = createParserFactory();
    registerXrayParser(factory);
    registerUrlParser(factory);
    registerSingBoxParser(factory);

    const selected = factory.selectParser(MULTI);
    expect(selected?.name).toBe("singbox");
    if (!selected) throw new Error("expected sing-box parser");

    const nodes = normalizeAll(selected.parser, selected.parser.parse(MULTI));
    expect(nodes).toHaveLength(4);
    expect(factory.list().sort()).toEqual(["singbox", "url", "xray"]);
  });
});
