import { describe, it, expect } from "vitest";
import {
  wireguardParser, registerWireguardParser, detectWireguard, parseWireguard,
  parseIni, itemsFromSections, normalizeItem, normalizeManyWireguard, recoverWireguard,
} from "../../core/parser/wireguard/index.js";
import { createParserFactory, normalizeAll } from "../../core/parser/factory.js";
import { registerXrayParser } from "../../core/parser/xray/index.js";
import { registerSingBoxParser } from "../../core/parser/singbox/index.js";
import { registerClashParser } from "../../core/parser/clash/index.js";
import { registerUrlParser } from "../../core/parser/url/index.js";
import { WIREGUARD_EXTENSION_NS } from "../../core/parser/shared/index.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import {
  MULTI_PEER, SINGLE_PEER, MISSPELLED_SECTION, PEER_NO_ENDPOINT, NO_PEER,
} from "./fixtures.js";

describe("WireGuardParser — BaseParser contract (multi-node, ADR-008)", () => {
  it("implements the required methods and declares producesMany", () => {
    for (const m of ["detect", "parse", "validateStructure", "normalize", "recover"]) {
      expect(typeof (/** @type {any} */ (wireguardParser)[m])).toBe("function");
    }
    expect(wireguardParser.producesMany).toBe(true);
    expect(typeof wireguardParser.normalizeMany).toBe("function");
  });
  it("normalize() refuses (multi-peer = many nodes, Rule 9)", () => {
    expect(() => wireguardParser.normalize(parseWireguard(SINGLE_PEER)))
      .toThrow(/normalizeMany|ANTI_CHAOS Rule 9|ADR-008/);
  });
});

describe("WireGuardParser.detect (Stage 02, [Interface]/[Peer] format)", () => {
  it("scores a wg-quick conf highly", () => {
    expect(detectWireguard(MULTI_PEER)).toBe(95);
    expect(detectWireguard(NO_PEER)).toBe(95); // [Interface] alone is still WG format
  });
  it("rejects JSON / YAML-with-proxies / URLs / empty (no collision)", () => {
    expect(detectWireguard(JSON.stringify({ outbounds: [] }))).toBe(0);
    expect(detectWireguard("proxies:\n  - {type: vless}")).toBe(0);
    expect(detectWireguard("wireguard://x@y:51820")).toBe(0);
    expect(detectWireguard("")).toBe(0);
  });
});

describe("WireGuardParser — INI parsing", () => {
  it("parses sections and lower-cases keys, skipping comments", () => {
    const sections = parseIni(MULTI_PEER);
    expect(sections.map((s) => s.name)).toEqual(["interface", "peer", "peer"]);
    expect(sections[0].entries.privatekey).toBe("PRIVKEY123=");
  });
  it("yields one item per [Peer], each carrying shared [Interface] fields", () => {
    const items = itemsFromSections(parseIni(MULTI_PEER));
    expect(items).toHaveLength(2);
    expect(items[0].privatekey).toBe("PRIVKEY123=");
    expect(items[1].privatekey).toBe("PRIVKEY123="); // shared
    expect(items[1].publickey).toBe("PEER2PUB=");
  });
});

describe("WireGuardParser — multi-peer expansion (Stage 09 + ADR-008)", () => {
  const nodes = normalizeManyWireguard(parseWireguard(MULTI_PEER));

  it("produces one node per peer", () => {
    expect(nodes).toHaveLength(2);
    expect(nodes.every((n) => n.protocol === "wireguard" && n.sourceType === "wireguard-config")).toBe(true);
  });
  it("parses the endpoint into the core address/port (IPv6-aware)", () => {
    expect(nodes[0].address).toBe("wg1.example.com");
    expect(nodes[0].port).toBe(51820);
    expect(nodes[1].address).toBe("2001:db8::1");
    expect(nodes[1].port).toBe(51821);
  });
  it("stores all WG fields under the SAME extensions.wireguard namespace as Sing-box/Clash (ADR-007)", () => {
    expect(WIREGUARD_EXTENSION_NS).toBe("wireguard");
    expect(nodes[0].extensions?.wireguard).toEqual({
      privateKey: "PRIVKEY123=",
      publicKey: "PEER1PUB=",
      presharedKey: "PSK1=",
      endpoint: "wg1.example.com:51820",
      allowedIPs: ["0.0.0.0/0", "::/0"],
      dns: ["1.1.1.1", "8.8.8.8"],
      mtu: 1420,
      persistentKeepalive: 25,
    });
    // exact key names match the shared builder's output (no new shape)
    expect(Object.keys(nodes[0].extensions?.wireguard ?? {}).sort()).toEqual([
      "allowedIPs", "dns", "endpoint", "mtu", "persistentKeepalive",
      "presharedKey", "privateKey", "publicKey",
    ]);
  });
  it("keeps nothing WireGuard-specific on the frozen UNM core", () => {
    expect(/** @type {any} */ (nodes[0]).privateKey).toBeUndefined();
    expect(/** @type {any} */ (nodes[0]).publicKey).toBeUndefined();
    expect(/** @type {any} */ (nodes[0]).allowedIPs).toBeUndefined();
  });
  it("every produced node validates through the Validation Engine", () => {
    for (const node of nodes) {
      expect(applyValidation(node).validation.overallValid).toBe(true);
    }
  });
});

describe("WireGuardParser — never fabricates, skips un-buildable peers (Rule 9 safe)", () => {
  it("a peer with no endpoint yields no node; the valid sibling still parses", () => {
    const nodes = normalizeManyWireguard(parseWireguard(PEER_NO_ENDPOINT));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].address).toBe("ok.example.com");
  });
  it("normalizeItem throws on a peer without an endpoint (no fabrication)", () => {
    expect(() => normalizeItem({ publickey: "x" })).toThrow(/PARSE_MISSING_REQUIRED/);
  });
  it("recovery never invents keys — only re-reads present lines", () => {
    const extraction = recoverWireguard(MISSPELLED_SECTION);
    expect(extraction).not.toBeNull();
    // privateKey/publicKey only present because they were in the input
    const node = normalizeManyWireguard(/** @type {any} */ (extraction))[0];
    expect(/** @type {any} */ (node.extensions?.wireguard).publicKey).toBe("PUB=");
  });
});

describe("WireGuardParser — parse() failure routing + recovery (Stage 10/11)", () => {
  it("throws when there is no [Peer] section", () => {
    expect(() => parseWireguard(NO_PEER)).toThrow(/PARSE_MISSING_REQUIRED/);
  });
  it("fuzzy-corrects a misspelled section header ([Peers] -> [Peer])", () => {
    const extraction = recoverWireguard(MISSPELLED_SECTION);
    expect(extraction).not.toBeNull();
    const node = normalizeManyWireguard(/** @type {any} */ (extraction))[0];
    expect(node.address).toBe("rec.example.com");
    expect(/** @type {any} */ (extraction).recoveryActions.some((/** @type {string} */ a) => a.includes("peers") && a.includes("peer"))).toBe(true);
  });
  it("returns null when nothing usable can be recovered", () => {
    expect(recoverWireguard("")).toBeNull();
    expect(recoverWireguard("just some text, no sections")).toBeNull();
  });
});

describe("WireGuardParser — advisory hints + validateStructure", () => {
  it("exposes advisory-only hints", () => {
    expect(wireguardParser.formatVersion?.()).toBe("wireguard-config");
    expect(wireguardParser.metadataHint?.()).toEqual({ parser: "WireGuardParser" });
  });
  it("validateStructure passes when items exist, fails when empty", () => {
    expect(wireguardParser.validateStructure(parseWireguard(SINGLE_PEER)).overallValid).toBe(true);
    expect(wireguardParser.validateStructure({ fields: { items: [] } }).overallValid).toBe(false);
  });
});

describe("WireGuardParser — end-to-end through ParserFactory (no confidence collision)", () => {
  it("is selected for a .conf over every other parser and expands via normalizeAll", () => {
    const factory = createParserFactory();
    registerXrayParser(factory);
    registerSingBoxParser(factory);
    registerClashParser(factory);
    registerUrlParser(factory);
    registerWireguardParser(factory);

    const selected = factory.selectParser(MULTI_PEER);
    expect(selected?.name).toBe("wireguard");
    if (!selected) throw new Error("expected wireguard parser");

    const nodes = normalizeAll(selected.parser, selected.parser.parse(MULTI_PEER));
    expect(nodes).toHaveLength(2);
    expect(factory.list().sort()).toEqual(["clash", "singbox", "url", "wireguard", "xray"]);
  });
});
