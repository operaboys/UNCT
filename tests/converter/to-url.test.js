/**
 * UNM -> URL serializer tests (Converter Engine, Phase 7 Item 1).
 *
 * The headline guarantee is the Phase 7 Exit Condition: NO data loss in a
 * round-trip. `parseUrl(toUrl(node))` must reproduce the same core node for
 * every protocol the URL Parser supports — so the round-trip block drives the
 * real Parser over the real serializer rather than asserting hand-written
 * URL strings (which would bake in one specific encoding). A second block
 * pins the emitted form's contract (canonical names, default omission, IPv6
 * bracketing, vmess JSON shape, the WireGuard/ADR-007 split).
 */
import { describe, it, expect } from "vitest";
import { parseUrl, normalizeUrl } from "../../core/parser/url/index.js";
import { toUrl } from "../../core/converter/to-url.js";
import { createNode } from "../../core/unm/create-node.js";
import {
  VLESS_REALITY, VLESS_WS_TLS, VMESS_WS, SS_SIP002, SS_LEGACY, TROJAN_WS,
  TUIC, HY2, WIREGUARD,
} from "../url/fixtures.js";

/** @param {string} raw */
const parse = (raw) => normalizeUrl(parseUrl(raw));

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

describe("toUrl — round-trips losslessly through the URL Parser (Phase 7 Exit Condition)", () => {
  const cases = {
    "VLESS + Reality + gRPC": VLESS_REALITY,
    "VLESS + WS + TLS (encoded path, alpn list)": VLESS_WS_TLS,
    "VMESS + WS (Base64 JSON)": VMESS_WS,
    "Shadowsocks SIP002": SS_SIP002,
    "Shadowsocks legacy": SS_LEGACY,
    "Trojan + WS + TLS": TROJAN_WS,
    "TUIC (uuid:password userinfo)": TUIC,
    "Hysteria2 (hy2 alias)": HY2,
    "WireGuard (keys under extensions, ADR-007)": WIREGUARD,
  };

  for (const [name, raw] of Object.entries(cases)) {
    it(`re-emits ${name} so re-parsing yields the identical core node`, () => {
      const original = parse(raw);
      const roundTripped = parse(toUrl(original));
      expect(core(roundTripped)).toEqual(core(original));
    });
  }
});

describe("toUrl — emitted form contract", () => {
  it("omits default network ('tcp') and security ('none') for clean URLs", () => {
    const node = parse("trojan://pw@plain.example.com:443#plain"); // tcp + (trojan implies no security string here)
    const url = toUrl(node);
    expect(url).not.toContain("type=");
    expect(url).not.toContain("security=");
    expect(url).toBe("trojan://pw@plain.example.com:443#plain");
  });

  it("uses CANONICAL synonym names (fingerprint, not fp; pbk, not publicKey)", () => {
    const url = toUrl(parse(VLESS_REALITY));
    expect(url).toContain("fingerprint=chrome");
    expect(url).toContain("pbk=PUBKEY123");
    expect(url).not.toMatch(/[?&]fp=/);
  });

  it("brackets an IPv6 literal so the WHATWG parser can read it back", () => {
    const v6 = parse("vless://uuid-1@[2001:db8::1]:443?type=tcp#v6");
    expect(v6.address).toBe("2001:db8::1");
    const url = toUrl(v6);
    expect(url).toContain("@[2001:db8::1]:443");
    expect(parse(url).address).toBe("2001:db8::1"); // and it survives the round-trip
  });

  it("emits vmess as Base64(JSON) with the well-known keys", () => {
    const url = toUrl(parse(VMESS_WS));
    expect(url.startsWith("vmess://")).toBe(true);
    const json = JSON.parse(decodeURIComponent(escape(atob(url.slice("vmess://".length)))));
    expect(json).toMatchObject({ v: "2", add: "vm.example.com", net: "ws", tls: "tls", scy: "auto" });
  });

  it("routes the WireGuard public key to `publicKey` (its WG synonym), never `pbk` (ADR-007)", () => {
    const url = toUrl(parse(WIREGUARD));
    expect(url).toContain("publicKey=pubkeyBBB");
    expect(url).not.toMatch(/[?&]pbk=/);
  });

  it("throws for a protocol that has no URL scheme", () => {
    const fake = /** @type {any} */ ({ protocol: "made-up", address: "h", port: 1 });
    expect(() => toUrl(fake)).toThrow(/CONVERT_UNSUPPORTED/);
  });

  it("accepts a freshly built node (not only parser output)", () => {
    const node = createNode(/** @type {any} */ ({
      sourceType: "vless-url", protocol: "vless", address: "h.example.com", port: 443,
      network: "ws", security: "tls", uuid: "u-1", sni: "h.example.com", path: "/p",
    }));
    expect(toUrl(node)).toBe(
      "vless://u-1@h.example.com:443?type=ws&security=tls&sni=h.example.com&path=%2Fp",
    );
  });
});
