import { describe, it, expect } from "vitest";
import {
  xrayParser, registerXrayParser, detectXray, parseXray, normalizeManyXray,
  normalizeItem, recoverXray, repairJson, fuzzyKey, levenshtein, resolvePriority,
  selectOutbound,
} from "../../core/parser/xray/index.js";
import { createParserFactory, normalizeAll } from "../../core/parser/factory.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import {
  VLESS_REALITY, VLESS_WS_TLS, TROJAN_TCP, SHADOWSOCKS, WITH_FREEDOM_FIRST,
  BROKEN_TRAILING_COMMA, MISSPELLED_PROTOCOL, REALITY_DOUBLE_PBK,
} from "./fixtures.js";

/** parse + expand, taking the first node (the sample fixtures are single-proxy). @param {string} input */
const run = (input) => normalizeManyXray(parseXray(input))[0];

describe("XrayParser — BaseParser contract (multi-node, ADR-008)", () => {
  it("implements the required methods and declares producesMany", () => {
    for (const m of ["detect", "parse", "validateStructure", "normalize", "recover"]) {
      expect(typeof (/** @type {any} */ (xrayParser)[m])).toBe("function");
    }
    expect(xrayParser.producesMany).toBe(true);
    expect(typeof xrayParser.normalizeMany).toBe("function");
  });
  it("normalize() refuses (no silent data loss, Rule 9)", () => {
    expect(() => xrayParser.normalize(parseXray(VLESS_REALITY)))
      .toThrow(/normalizeMany|ANTI_CHAOS Rule 9|ADR-008/);
  });
});

describe("XrayParser.detect (Stage 02 confidence)", () => {
  it("scores a well-formed Xray config highly", () => {
    expect(detectXray(VLESS_REALITY)).toBe(95);
  });
  it("rejects URL-scheme and non-JSON input", () => {
    expect(detectXray("vless://uuid@host:443")).toBe(0);
    expect(detectXray("proxies:\n  - name: x")).toBe(0);
    expect(detectXray("")).toBe(0);
  });
  it("gives a recoverable score to broken-but-Xray JSON", () => {
    expect(detectXray(BROKEN_TRAILING_COMMA)).toBe(60);
  });
});

describe("XrayParser — VLESS + Reality + gRPC", () => {
  const node = run(VLESS_REALITY);
  it("normalizes core fields", () => {
    expect(node.protocol).toBe("vless");
    expect(node.address).toBe("example.com");
    expect(node.port).toBe(443);
    expect(node.network).toBe("grpc");
    expect(node.security).toBe("reality");
    expect(node.uuid).toBe("b831381d-6324-4d53-ad4f-8cda48b30811");
    expect(node.flow).toBe("xtls-rprx-vision");
    expect(node.serviceName).toBe("grpc-svc");
    expect(node.remark).toBe("proxy-reality");
  });
  it("renames reality synonyms to canonical names and records originalMappings", () => {
    expect(node.pbk).toBe("xL3mPq9vReALitYpUbKeY00000000000000000000000");
    expect(node.sid).toBe("ab12");
    expect(node.sni).toBe("www.microsoft.com");
    expect(node.fingerprint).toBe("chrome");
    expect(node.metadata.originalMappings).toMatchObject({
      publicKey: "pbk", shortId: "sid", serverName: "sni",
    });
    expect(node.metadata.originalMappings.fingerprint).toBeUndefined();
    expect(/** @type {any} */ (node).publicKey).toBeUndefined();
    expect(/** @type {any} */ (node).serverName).toBeUndefined();
  });
});

describe("XrayParser — value normalization (Stage 13.1)", () => {
  it("maps the 'websocket' spelling to 'ws'", () => {
    expect(run(VLESS_WS_TLS).network).toBe("ws");
  });
  it("extracts WS path and Host header, and TLS sni/alpn", () => {
    const node = run(VLESS_WS_TLS);
    expect(node.path).toBe("/ws");
    expect(node.host).toBe("cdn.example.com");
    expect(node.sni).toBe("cdn.example.com");
    expect(node.alpn).toEqual(["h2", "http/1.1"]);
  });
  it("warns and defaults when a network value is unmapped", () => {
    const input = JSON.stringify({
      outbounds: [{
        protocol: "vless",
        settings: { vnext: [{ address: "x.com", port: 443, users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811" }] }] },
        streamSettings: { network: "carrier-pigeon" },
      }],
    });
    const node = run(input);
    expect(node.network).toBe("tcp");
    expect(node.metadata.warnings.some((w) => w.startsWith("PARSE_UNMAPPED_VALUE"))).toBe(true);
  });
});

describe("XrayParser — Trojan / Shadowsocks via settings.servers[]", () => {
  it("extracts a Trojan password from the server entry", () => {
    const node = run(TROJAN_TCP);
    expect(node.protocol).toBe("trojan");
    expect(node.password).toBe("s3cr3t-pass");
    expect(node.uuid).toBeUndefined();
  });
  it("extracts Shadowsocks method + password", () => {
    const node = run(SHADOWSOCKS);
    expect(node.protocol).toBe("shadowsocks");
    expect(node.method).toBe("aes-256-gcm");
    expect(node.password).toBe("ss-pass");
  });
});

describe("XrayParser — Multi-Outbound · Multi-User (04 Stage 04, ADR-008)", () => {
  it("produces one node per proxy outbound, skipping freedom/blackhole", () => {
    const nodes = normalizeManyXray(parseXray(WITH_FREEDOM_FIRST));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].protocol).toBe("vmess");
    expect(nodes[0].address).toBe("vmess.example.com");
  });
  it("expands a single outbound with multiple users into one node each", () => {
    const cfg = JSON.stringify({
      outbounds: [{
        protocol: "vless", tag: "multi",
        settings: { vnext: [{ address: "a.com", port: 443, users: [
          { id: "b831381d-6324-4d53-ad4f-8cda48b30811", flow: "xtls-rprx-vision" },
          { id: "c831381d-6324-4d53-ad4f-8cda48b30822" },
        ] }] },
        streamSettings: { network: "ws", security: "tls", tlsSettings: { serverName: "a.com" } },
      }],
    });
    const nodes = normalizeManyXray(parseXray(cfg));
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.uuid)).toEqual([
      "b831381d-6324-4d53-ad4f-8cda48b30811",
      "c831381d-6324-4d53-ad4f-8cda48b30822",
    ]);
    expect(nodes[0].flow).toBe("xtls-rprx-vision");
    expect(nodes[1].flow).toBeUndefined();
    // shared stream fields apply to both
    expect(nodes.every((n) => n.network === "ws" && n.sni === "a.com")).toBe(true);
  });
  it("expands multiple outbounds AND multiple users together", () => {
    const cfg = JSON.stringify({
      outbounds: [
        { protocol: "freedom", tag: "direct" },
        { protocol: "vless", settings: { vnext: [{ address: "a.com", port: 443, users: [{ id: "11111111-1111-4111-8111-111111111111" }, { id: "22222222-2222-4222-8222-222222222222" }] }] }, streamSettings: { network: "tcp" } },
        { protocol: "trojan", settings: { servers: [{ address: "t.com", port: 443, password: "pw" }] }, streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: "t.com" } } },
      ],
    });
    const nodes = normalizeManyXray(parseXray(cfg));
    expect(nodes.map((n) => n.protocol)).toEqual(["vless", "vless", "trojan"]);
  });
  it("selectOutbound returns null when no proxy outbound exists", () => {
    expect(selectOutbound({ outbounds: [{ protocol: "freedom" }, { protocol: "blackhole" }] })).toBeNull();
  });
});

describe("XrayParser — Priority Chain (05 §2)", () => {
  it("picks the highest-priority synonym and records the loser too", () => {
    const node = run(REALITY_DOUBLE_PBK);
    expect(node.pbk).toBe("WINNER_PUBKEY");
    expect(node.metadata.originalMappings.publicKey).toBe("pbk");
    expect(node.metadata.originalMappings.serverPublicKey).toBe("pbk");
  });
  it("resolvePriority records every present synonym and returns the first", () => {
    /** @type {Record<string, string>} */
    const om = {};
    const winner = resolvePriority(
      { serverName: "b.com", sni: "a.com" }, ["serverName", "sni"], "sni", om,
    );
    expect(winner).toBe("b.com");
    expect(om).toEqual({ serverName: "sni" });
  });
});

describe("XrayParser — parse() failure routing + skip-on-fail", () => {
  it("throws on malformed JSON so the factory can fall back to recover()", () => {
    expect(() => parseXray(BROKEN_TRAILING_COMMA)).toThrow(/PARSE_MISSING_REQUIRED/);
  });
  it("throws when there is no proxy outbound", () => {
    expect(() => parseXray(JSON.stringify({ outbounds: [{ protocol: "freedom" }] }))).toThrow(/PARSE_MISSING_REQUIRED/);
  });
  it("normalizeItem throws on a missing address (no fabrication)", () => {
    expect(() => normalizeItem({ protocol: "vless", port: 443 })).toThrow(/PARSE_MISSING_REQUIRED/);
  });
  it("skips an un-buildable outbound but keeps the valid sibling", () => {
    const cfg = JSON.stringify({
      outbounds: [
        { protocol: "vless", settings: { vnext: [{ port: 443, users: [{ id: "x" }] }] }, streamSettings: { network: "tcp" } }, // no address
        { protocol: "trojan", settings: { servers: [{ address: "ok.com", port: 443, password: "p" }] }, streamSettings: { network: "tcp" } },
      ],
    });
    const nodes = normalizeManyXray(parseXray(cfg));
    expect(nodes).toHaveLength(1);
    expect(nodes[0].address).toBe("ok.com");
  });
});

describe("XrayParser — recovery (Stage 10/11)", () => {
  it("repairs trailing commas + comments and recovers the node", () => {
    const extraction = recoverXray(BROKEN_TRAILING_COMMA);
    expect(extraction).not.toBeNull();
    const node = normalizeManyXray(/** @type {any} */ (extraction))[0];
    expect(node.address).toBe("recover.example.com");
    expect(node.metadata.recoveryActions.some((a) => a.startsWith("REC_STRUCTURE_REPAIRED"))).toBe(true);
  });
  it("fuzzy-matches a misspelled key without inventing data", () => {
    const extraction = recoverXray(MISSPELLED_PROTOCOL);
    expect(extraction).not.toBeNull();
    const node = normalizeManyXray(/** @type {any} */ (extraction))[0];
    expect(node.protocol).toBe("vless");
    expect(node.metadata.recoveryActions.some((a) => a.includes("protocl") && a.includes("protocol"))).toBe(true);
  });
  it("NEVER invents missing security data (uuid stays absent)", () => {
    const noUuid = JSON.stringify({
      outbounds: [{
        protocol: "vless",
        settings: { vnext: [{ address: "x.com", port: 443, users: [{}] }] },
        streamSettings: { network: "tcp" },
      }],
    });
    const extraction = recoverXray(noUuid);
    expect(extraction).not.toBeNull();
    expect(/** @type {any} */ (extraction).fields.items[0].id).toBeUndefined();
  });
  it("returns null when the JSON cannot be repaired into validity", () => {
    expect(recoverXray("{ this is not ::: json")).toBeNull();
    expect(recoverXray("")).toBeNull();
  });
});

describe("XrayParser.validateStructure (structure only, not Stage 13)", () => {
  it("passes when the extraction carries items", () => {
    expect(xrayParser.validateStructure(parseXray(TROJAN_TCP)).overallValid).toBe(true);
  });
  it("fails when there are no items", () => {
    expect(xrayParser.validateStructure({ fields: { items: [] } }).overallValid).toBe(false);
  });
});

describe("XrayParser — end-to-end through ParserFactory + Validation Engine", () => {
  it("registers, gets selected by confidence, and produces valid node(s) via normalizeAll", () => {
    const factory = createParserFactory();
    registerXrayParser(factory);

    const selected = factory.selectParser(VLESS_REALITY);
    expect(selected?.name).toBe("xray");
    if (!selected) throw new Error("expected a selected parser");

    const nodes = normalizeAll(selected.parser, selected.parser.parse(VLESS_REALITY));
    expect(nodes).toHaveLength(1);
    const validated = applyValidation(nodes[0]);
    expect(validated.validation.overallValid).toBe(true);
    expect(validated.validation.realityValid).toBe(true);
    expect(validated.validation.uuidValid).toBe(true);
  });

  it("recovers a broken config through the factory fallback chain", () => {
    const factory = createParserFactory();
    registerXrayParser(factory);
    const { extraction, recovered } = factory.parseWithFallback(BROKEN_TRAILING_COMMA);
    expect(recovered).toBe(true);
    expect(normalizeManyXray(/** @type {any} */ (extraction))[0].address).toBe("recover.example.com");
  });
});

describe("XrayParser — advisory hints (12 §2.1) and input shapes", () => {
  it("exposes advisory-only hints that do not affect parsing", () => {
    expect(xrayParser.formatVersion?.()).toBe("xray-json");
    expect(xrayParser.metadataHint?.()).toEqual({ parser: "XrayParser" });
  });
  it("accepts a bare outbound object (no outbounds wrapper)", () => {
    const bare = JSON.stringify({
      protocol: "trojan",
      settings: { servers: [{ address: "bare.example.com", port: 443, password: "p" }] },
      streamSettings: { network: "tcp" },
    });
    expect(detectXray(bare)).toBe(95);
    expect(run(bare).address).toBe("bare.example.com");
  });
  it("scores parseable JSON with Xray keys but no usable outbound as low/recoverable", () => {
    expect(detectXray(JSON.stringify({ outbounds: [{ protocol: "freedom" }] }))).toBe(55);
  });
});

describe("recover.js helpers", () => {
  it("levenshtein computes edit distance", () => {
    expect(levenshtein("protocl", "protocol")).toBe(1);
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
  });
  it("fuzzyKey finds a near-miss key but not a far one", () => {
    expect(fuzzyKey({ protocl: 1 }, "protocol")).toBe("protocl");
    expect(fuzzyKey({ zzzzz: 1 }, "protocol")).toBeNull();
    expect(fuzzyKey({ protocol: 1 }, "protocol")).toBe("protocol");
  });
  it("repairJson strips trailing commas and comments", () => {
    const { text, actions } = repairJson('{"a":1,}');
    expect(JSON.parse(text)).toEqual({ a: 1 });
    expect(actions.length).toBeGreaterThan(0);
  });
});
