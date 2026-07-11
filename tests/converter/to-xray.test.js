/**
 * UNM -> Xray JSON serializer tests (Converter Engine, Phase 7 Item 2).
 *
 * Same headline guarantee as to-url.test.js's Phase 7 Exit Condition: NO data
 * loss in a round-trip. `normalizeManyXray(parseXray(toXray(node)))[0]` must
 * reproduce the same core node for every protocol the Xray Parser actually
 * builds — so the round-trip block drives the real Parser over the real
 * serializer rather than asserting a hand-written JSON string (which would
 * bake in one specific shape). A second block pins the emitted form's
 * contract (canonical synonym names, default omission, per-network settings
 * keys, the CONVERT_UNSUPPORTED boundary for protocols Xray has no shape for).
 */
import { describe, it, expect } from "vitest";
import { parseXray, normalizeManyXray } from "../../core/parser/xray/index.js";
import { toXray } from "../../core/converter/to-xray.js";
import { createNode } from "../../core/unm/create-node.js";
import {
  VLESS_REALITY, VLESS_WS_TLS, TROJAN_TCP, SHADOWSOCKS, WITH_FREEDOM_FIRST,
} from "../xray/fixtures.js";

/** @param {string} raw */
const parse = (raw) => normalizeManyXray(parseXray(raw))[0];

/**
 * The comparable "core" of a node — everything except the system-generated
 * identity/timestamps and the parse-provenance metadata/validation, which are
 * legitimately allowed to differ between two independent parses.
 * @param {import("../../core/types/unm").UNMNode} node
 */
function core(node) {
  const { nodeId, createdAt, updatedAt, metadata, validation, ...rest } = node;
  return rest;
}

describe("toXray — round-trips losslessly through the Xray Parser (Phase 7 Exit Condition)", () => {
  const cases = {
    "VLESS + Reality + gRPC": VLESS_REALITY,
    "VLESS + WS + TLS (Host header, alpn list)": VLESS_WS_TLS,
    "Trojan (password via settings.servers)": TROJAN_TCP,
    "Shadowsocks (method + password via settings.servers)": SHADOWSOCKS,
    "VMESS (settings.vnext, freedom outbound skipped)": WITH_FREEDOM_FIRST,
  };

  for (const [name, raw] of Object.entries(cases)) {
    it(`re-emits ${name} so re-parsing yields the identical core node`, () => {
      const original = parse(raw);
      const roundTripped = parse(toXray(original));
      expect(core(roundTripped)).toEqual(core(original));
    });
  }
});

describe("toXray — emitted form contract", () => {
  it("omits default network ('tcp') and security ('none') for clean configs", () => {
    const node = parse(SHADOWSOCKS); // tcp + none
    const json = JSON.parse(toXray(node));
    const ob = json.outbounds[0];
    expect(ob.streamSettings).toBeUndefined();
  });

  it("uses CANONICAL synonym names (publicKey, not pbk; serverName, not sni)", () => {
    const json = JSON.parse(toXray(parse(VLESS_REALITY)));
    const reality = json.outbounds[0].streamSettings.realitySettings;
    expect(reality.publicKey).toBe("xL3mPq9vReALitYpUbKeY00000000000000000000000");
    expect(reality.shortId).toBe("ab12");
    expect(reality.serverName).toBe("www.microsoft.com");
    expect(reality.pbk).toBeUndefined();
    expect(reality.sid).toBeUndefined();
    expect(reality.sni).toBeUndefined();
  });

  it("routes WS path/Host and gRPC serviceName to their own settings blocks", () => {
    const ws = JSON.parse(toXray(parse(VLESS_WS_TLS))).outbounds[0].streamSettings;
    expect(ws.wsSettings).toEqual({ path: "/ws", headers: { Host: "cdn.example.com" } });
    expect(ws.tlsSettings.alpn).toEqual(["h2", "http/1.1"]);

    const grpc = JSON.parse(toXray(parse(VLESS_REALITY))).outbounds[0].streamSettings;
    expect(grpc.grpcSettings).toEqual({ serviceName: "grpc-svc" });
  });

  it("places Trojan/Shadowsocks credentials on settings.servers, never settings.vnext", () => {
    const trojan = JSON.parse(toXray(parse(TROJAN_TCP))).outbounds[0].settings;
    expect(trojan.servers).toEqual([{ address: "trojan.example.com", port: 443, password: "s3cr3t-pass" }]);
    expect(trojan.vnext).toBeUndefined();

    const ss = JSON.parse(toXray(parse(SHADOWSOCKS))).outbounds[0].settings;
    expect(ss.servers).toEqual([{
      address: "ss.example.com", port: 8388, method: "aes-256-gcm", password: "ss-pass",
    }]);
  });

  it("carries the remark to the outbound tag", () => {
    const json = JSON.parse(toXray(parse(VLESS_REALITY)));
    expect(json.outbounds[0].tag).toBe("proxy-reality");
  });

  it("throws for a protocol with no Xray JSON shape in this codebase", () => {
    const fake = /** @type {any} */ ({ protocol: "tuic", address: "h", port: 1 });
    expect(() => toXray(fake)).toThrow(/CONVERT_UNSUPPORTED/);
  });

  it("accepts a freshly built node (not only parser output)", () => {
    const node = createNode(/** @type {any} */ ({
      sourceType: "vless-url", protocol: "vless", address: "h.example.com", port: 443,
      network: "ws", security: "tls", uuid: "u-1", sni: "h.example.com", path: "/p",
    }));
    expect(JSON.parse(toXray(node))).toEqual({
      outbounds: [{
        protocol: "vless",
        settings: { vnext: [{ address: "h.example.com", port: 443, users: [{ id: "u-1" }] }] },
        streamSettings: {
          network: "ws", security: "tls",
          tlsSettings: { serverName: "h.example.com" },
          wsSettings: { path: "/p" },
        },
      }],
    });
  });
});
