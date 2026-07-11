/**
 * UNM -> Sing-box JSON serializer tests (Converter Engine, Phase 7 Item 3).
 *
 * Same headline guarantee as to-url.test.js / to-xray.test.js's Phase 7 Exit
 * Condition: NO data loss in a round-trip. `normalizeManySingBox(parseSingBox(
 * toSingBox(node)))[0]` must reproduce the same core node for every protocol
 * the Sing-box Parser supports — including WireGuard, whose key material must
 * land back under `extensions.wireguard`, never `pbk`/`sid` (ADR-007) — so the
 * round-trip block drives the real Parser over the real serializer rather
 * than asserting a hand-written JSON string. A second block pins the emitted
 * form's contract (canonical names, default-block omission, the WireGuard /
 * Reality field split).
 */
import { describe, it, expect } from "vitest";
import { parseSingBox, normalizeManySingBox } from "../../core/parser/singbox/index.js";
import { toSingBox } from "../../core/converter/to-singbox.js";
import { createNode } from "../../core/unm/create-node.js";
import { MULTI, SINGLE_VMESS, ENDPOINTS_WG } from "../singbox/fixtures.js";

/** @param {string} raw */
const parseAll = (raw) => normalizeManySingBox(parseSingBox(raw));

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

describe("toSingBox — round-trips losslessly through the Sing-box Parser (Phase 7 Exit Condition)", () => {
  const multiNodes = parseAll(MULTI);
  const cases = {
    "VLESS + Reality + gRPC (from MULTI)": multiNodes[0],
    "Shadowsocks (from MULTI)": multiNodes[1],
    "Trojan + WS + TLS (from MULTI)": multiNodes[2],
    "WireGuard, legacy outbound (from MULTI)": multiNodes[3],
    "VMESS + WS + TLS": parseAll(SINGLE_VMESS)[0],
    "WireGuard, modern endpoints[] shape": parseAll(ENDPOINTS_WG)[0],
  };

  for (const [name, original] of Object.entries(cases)) {
    it(`re-emits ${name} so re-parsing yields the identical core node`, () => {
      const roundTripped = parseAll(toSingBox(original))[0];
      expect(core(roundTripped)).toEqual(core(original));
    });
  }
});

describe("toSingBox — emitted form contract", () => {
  it("omits the tls/transport blocks for default security ('none') and network ('tcp')", () => {
    const node = parseAll(MULTI)[1]; // shadowsocks: tcp + none
    const ob = JSON.parse(toSingBox(node)).outbounds[0];
    expect(ob.tls).toBeUndefined();
    expect(ob.transport).toBeUndefined();
  });

  it("uses CANONICAL synonym names (public_key/short_id/server_name, not pbk/sid/sni)", () => {
    const node = parseAll(MULTI)[0]; // vless + reality
    const ob = JSON.parse(toSingBox(node)).outbounds[0];
    expect(ob.tls.reality.public_key).toBe("PUB123");
    expect(ob.tls.reality.short_id).toBe("ab12");
    expect(ob.tls.server_name).toBe("sni.example.com");
    expect(ob.tls.reality.pbk).toBeUndefined();
    expect(ob.tls.reality.sid).toBeUndefined();
    expect(ob.tls.sni).toBeUndefined();
  });

  it("routes the WireGuard public key to peer_public_key (its sing-box synonym), never tls.reality (ADR-007)", () => {
    const wg = parseAll(MULTI)[3];
    const ob = JSON.parse(toSingBox(wg)).outbounds[0];
    expect(ob.peer_public_key).toBe("PEERKEY");
    expect(ob.private_key).toBe("PRIVKEY");
    expect(ob.pre_shared_key).toBe("PSK");
    expect(ob.local_address).toEqual(["10.0.0.2/32", "fd00::2/128"]);
    expect(ob.tls).toBeUndefined();
  });

  it("nests WS path/Host and gRPC serviceName under transport, never top-level", () => {
    const vmess = parseAll(SINGLE_VMESS)[0];
    const ob = JSON.parse(toSingBox(vmess)).outbounds[0];
    expect(ob.transport).toEqual({ type: "ws", path: "/v", headers: { Host: "vm.example.com" } });

    const reality = parseAll(MULTI)[0];
    const grpcOb = JSON.parse(toSingBox(reality)).outbounds[0];
    expect(grpcOb.transport).toEqual({ type: "grpc", service_name: "gsvc" });
  });

  it("carries the remark to the outbound tag", () => {
    const node = parseAll(MULTI)[2];
    expect(JSON.parse(toSingBox(node)).outbounds[0].tag).toBe("tj-node");
  });

  it("throws for a protocol outside the UNM Protocol enum", () => {
    const fake = /** @type {any} */ ({ protocol: "made-up", address: "h", port: 1 });
    expect(() => toSingBox(fake)).toThrow(/CONVERT_UNSUPPORTED/);
  });

  it("accepts a freshly built node (not only parser output)", () => {
    const node = createNode(/** @type {any} */ ({
      sourceType: "vless-url", protocol: "vless", address: "h.example.com", port: 443,
      network: "ws", security: "tls", uuid: "u-1", sni: "h.example.com", path: "/p",
    }));
    expect(JSON.parse(toSingBox(node))).toEqual({
      outbounds: [{
        type: "vless", server: "h.example.com", server_port: 443, uuid: "u-1",
        tls: { enabled: true, server_name: "h.example.com" },
        transport: { type: "ws", path: "/p" },
      }],
    });
  });
});
