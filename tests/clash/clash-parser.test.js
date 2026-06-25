import { describe, it, expect } from "vitest";
import {
  clashParser, registerClashParser, detectClash, parseClash, loadClashYaml,
  collectProxies, normalizeItem, normalizeManyClash, recoverClash,
} from "../../core/parser/clash/index.js";
import { createParserFactory, normalizeAll } from "../../core/parser/factory.js";
import { registerXrayParser } from "../../core/parser/xray/index.js";
import { registerSingBoxParser } from "../../core/parser/singbox/index.js";
import { registerUrlParser } from "../../core/parser/url/index.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import {
  MULTI, SINGLE_VMESS, BROKEN_TABS, MISSING_SERVER, NO_PROXIES, UUID,
} from "./fixtures.js";

describe("ClashParser — BaseParser contract (multi-node, ADR-008)", () => {
  it("implements the required methods and declares producesMany", () => {
    for (const m of ["detect", "parse", "validateStructure", "normalize", "recover"]) {
      expect(typeof (/** @type {any} */ (clashParser)[m])).toBe("function");
    }
    expect(clashParser.producesMany).toBe(true);
    expect(typeof clashParser.normalizeMany).toBe("function");
  });
  it("normalize() refuses (no silent data loss, Rule 9)", () => {
    expect(() => clashParser.normalize(parseClash(MULTI)))
      .toThrow(/normalizeMany|ANTI_CHAOS Rule 9|ADR-008/);
  });
});

describe("ClashParser.detect (Stage 02, YAML with proxies:)", () => {
  it("scores a Clash config highly", () => {
    expect(detectClash(MULTI)).toBe(95);
  });
  it("scores a JSON config 0 (it has outbounds, not proxies)", () => {
    expect(detectClash(JSON.stringify({ outbounds: [{ type: "vless", server: "x", server_port: 1 }] }))).toBe(0);
  });
  it("gives a recoverable score to broken YAML that still shows proxies:", () => {
    expect(detectClash(BROKEN_TABS)).toBe(60);
  });
  it("rejects URLs, empty, and proxy-less YAML", () => {
    expect(detectClash("vless://x@y:443")).toBe(0);
    expect(detectClash("")).toBe(0);
    expect(detectClash(NO_PROXIES)).toBe(0);
  });
});

describe("ClashParser — collection skips non-proxy entries", () => {
  it("collects only the proxies[] array", () => {
    expect(collectProxies(loadClashYaml(MULTI))).toHaveLength(4);
    expect(collectProxies(loadClashYaml(NO_PROXIES))).toHaveLength(0);
  });
});

describe("ClashParser — multi-node expansion (Stage 06 + ADR-008)", () => {
  const nodes = normalizeManyClash(parseClash(MULTI));

  it("produces one node per proxy", () => {
    expect(nodes.map((n) => n.protocol)).toEqual(["vless", "shadowsocks", "trojan", "wireguard"]);
  });
  it("normalizes VLESS+Reality, mapping Clash kebab-case synonyms", () => {
    const vless = nodes[0];
    expect(vless.sourceType).toBe("clash-meta-yaml");
    expect(vless.network).toBe("grpc");
    expect(vless.security).toBe("reality");
    expect(vless.uuid).toBe(UUID);
    expect(vless.pbk).toBe("PUB123");
    expect(vless.sid).toBe("ab12");
    expect(vless.sni).toBe("sni.example.com");
    expect(vless.fingerprint).toBe("chrome");
    expect(vless.serviceName).toBe("gsvc");
    expect(vless.metadata.originalMappings).toMatchObject({
      public_key: "pbk", short_id: "sid", servername: "sni", client_fingerprint: "fingerprint",
    });
  });
  it("treats trojan/hysteria2/tuic as TLS-native and maps ss cipher to method", () => {
    expect(nodes[1].method).toBe("aes-256-gcm"); // ss
    expect(nodes[1].security).toBe("none");
    expect(nodes[2].security).toBe("tls"); // trojan, no explicit tls flag
    expect(nodes[2].network).toBe("ws");
    expect(nodes[2].alpn).toEqual(["h2", "http/1.1"]);
  });
  it("routes WireGuard keys to extensions.wireguard (ADR-007)", () => {
    expect(nodes[3].extensions?.wireguard).toEqual({
      privateKey: "PRIVKEY", publicKey: "PEERKEY", presharedKey: "PSK",
      allowedIPs: ["10.0.0.2/32"], mtu: 1420,
    });
  });
  it("non-meta proxies (ss/trojan/wireguard) get the plain clash-yaml source type", () => {
    expect(nodes[1].sourceType).toBe("clash-yaml");
    expect(nodes[2].sourceType).toBe("clash-yaml");
  });
  it("every produced node validates through the Validation Engine", () => {
    for (const node of nodes) {
      expect(applyValidation(node).validation.overallValid).toBe(true);
    }
  });
});

describe("ClashParser — vmess cipher -> encryption", () => {
  it("maps a single vmess proxy with tls + ws", () => {
    const [node] = normalizeManyClash(parseClash(SINGLE_VMESS));
    expect(node.protocol).toBe("vmess");
    expect(node.security).toBe("tls");
    expect(node.network).toBe("ws");
    expect(node.encryption).toBe("auto");
    expect(node.path).toBe("/v");
    expect(node.host).toBe("vm.example.com");
  });
});

describe("ClashParser — never fabricates, skips un-buildable proxies", () => {
  it("a proxy missing its server yields no node; the valid sibling still parses", () => {
    const nodes = normalizeManyClash(parseClash(MISSING_SERVER));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].address).toBe("ok.example.com");
  });
  it("normalizeItem throws on a missing server (no fabrication)", () => {
    expect(() => normalizeItem({ type: "vless", port: 443 })).toThrow(/PARSE_MISSING_REQUIRED/);
  });
});

describe("ClashParser — parse() failure routing + recovery (Stage 10)", () => {
  it("throws on no proxies", () => {
    expect(() => parseClash(NO_PROXIES)).toThrow(/PARSE_MISSING_REQUIRED/);
  });
  it("recovers tab-indented YAML by replacing tabs with spaces", () => {
    const extraction = recoverClash(BROKEN_TABS);
    expect(extraction).not.toBeNull();
    const nodes = normalizeManyClash(/** @type {any} */ (extraction));
    expect(nodes[0].address).toBe("rec.example.com");
    expect(/** @type {any} */ (extraction).recoveryActions.some((/** @type {string} */ a) => a.includes("tabs"))).toBe(true);
  });
  it("returns null when nothing usable can be recovered", () => {
    expect(recoverClash("")).toBeNull();
    expect(recoverClash("rules:\n  - MATCH,DIRECT")).toBeNull();
  });
});

describe("ClashParser — advisory hints + validateStructure", () => {
  it("exposes advisory-only hints", () => {
    expect(clashParser.formatVersion?.()).toBe("clash-yaml");
    expect(clashParser.metadataHint?.()).toEqual({ parser: "ClashParser" });
  });
  it("validateStructure passes when items exist, fails when empty", () => {
    expect(clashParser.validateStructure(parseClash(MULTI)).overallValid).toBe(true);
    expect(clashParser.validateStructure({ fields: { items: [] } }).overallValid).toBe(false);
  });
});

describe("ClashParser — end-to-end through ParserFactory (no confidence collision)", () => {
  it("is selected for Clash YAML over the JSON/URL parsers and expands via normalizeAll", () => {
    const factory = createParserFactory();
    registerXrayParser(factory);
    registerSingBoxParser(factory);
    registerUrlParser(factory);
    registerClashParser(factory);

    const selected = factory.selectParser(MULTI);
    expect(selected?.name).toBe("clash");
    if (!selected) throw new Error("expected clash parser");

    const nodes = normalizeAll(selected.parser, selected.parser.parse(MULTI));
    expect(nodes).toHaveLength(4);
    expect(factory.list().sort()).toEqual(["clash", "singbox", "url", "xray"]);
  });
});
