/**
 * UNM -> Clash YAML serializer tests (Converter Engine, Phase 7 Item 4).
 *
 * Same headline guarantee as to-xray.test.js / to-singbox.test.js's Phase 7
 * Exit Condition: NO data loss in a round-trip. `normalizeManyClash(parseClash(
 * toClash(node)))[0]` must reproduce the same core node for every protocol the
 * Clash Parser supports — including WireGuard, whose key material must land
 * back under `extensions.wireguard` and never under `reality-opts` (ADR-007,
 * the boundary the Sing-box serializer already got right) — so the round-trip
 * block drives the real Parser over the real serializer rather than asserting
 * a hand-written YAML string. A second block pins the emitted form's contract
 * (canonical names, Clash-native `ss` spelling, default-key omission, the
 * WireGuard / Reality field split).
 */
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import { parseClash, normalizeManyClash } from "../../core/parser/clash/index.js";
import { toClash } from "../../core/converter/to-clash.js";
import { createNode } from "../../core/unm/create-node.js";
import { MULTI, SINGLE_VMESS } from "../clash/fixtures.js";

/** @param {string} raw */
const parseAll = (raw) => normalizeManyClash(parseClash(raw));

/** @param {string} raw @returns {any} */
const loadYaml = (raw) => yaml.load(raw);

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

describe("toClash — round-trips losslessly through the Clash Parser (Phase 7 Exit Condition)", () => {
  const multiNodes = parseAll(MULTI);
  const cases = {
    "VLESS + Reality + gRPC (from MULTI)": multiNodes[0],
    "Shadowsocks (from MULTI)": multiNodes[1],
    "Trojan + WS + TLS (from MULTI)": multiNodes[2],
    "WireGuard (from MULTI)": multiNodes[3],
    "VMESS + WS + TLS": parseAll(SINGLE_VMESS)[0],
  };

  for (const [name, original] of Object.entries(cases)) {
    it(`re-emits ${name} so re-parsing yields the identical core node`, () => {
      const roundTripped = parseAll(toClash(original))[0];
      expect(core(roundTripped)).toEqual(core(original));
    });
  }
});

describe("toClash — emitted form contract", () => {
  it("omits the network/security-related keys for default network ('tcp') and security ('none')", () => {
    const node = parseAll(MULTI)[1]; // shadowsocks: tcp + none
    const proxy = loadYaml(toClash(node)).proxies[0];
    expect(proxy.network).toBeUndefined();
    expect(proxy["ws-opts"]).toBeUndefined();
    expect(proxy.tls).toBeUndefined();
    expect(proxy["reality-opts"]).toBeUndefined();
  });

  it("emits Clash's NATIVE type spelling for shadowsocks ('ss', not 'shadowsocks')", () => {
    const node = parseAll(MULTI)[1];
    const proxy = loadYaml(toClash(node)).proxies[0];
    expect(proxy.type).toBe("ss");
  });

  it("uses CANONICAL synonym names (servername/client-fingerprint, not sni/fingerprint) nested reality-opts public-key/short-id", () => {
    const node = parseAll(MULTI)[0]; // vless + reality
    const proxy = loadYaml(toClash(node)).proxies[0];
    expect(proxy.servername).toBe("sni.example.com");
    expect(proxy["client-fingerprint"]).toBe("chrome");
    expect(proxy["reality-opts"]).toEqual({ "public-key": "PUB123", "short-id": "ab12" });
    expect(proxy.sni).toBeUndefined();
    expect(proxy.fingerprint).toBeUndefined();
  });

  it("routes the WireGuard public key to the top-level public-key field (its Clash synonym), never reality-opts (ADR-007)", () => {
    const wg = parseAll(MULTI)[3];
    const proxy = loadYaml(toClash(wg)).proxies[0];
    expect(proxy["public-key"]).toBe("PEERKEY");
    expect(proxy["private-key"]).toBe("PRIVKEY");
    expect(proxy["pre-shared-key"]).toBe("PSK");
    expect(proxy.ip).toBe("10.0.0.2/32");
    expect(proxy["reality-opts"]).toBeUndefined();
    expect(proxy.tls).toBeUndefined();
  });

  it("nests WS path/Host and gRPC service-name under ws-opts/grpc-opts, never top-level", () => {
    const vmess = parseAll(SINGLE_VMESS)[0];
    const proxy = loadYaml(toClash(vmess)).proxies[0];
    expect(proxy["ws-opts"]).toEqual({ path: "/v", headers: { Host: "vm.example.com" } });

    const reality = parseAll(MULTI)[0];
    const grpcProxy = loadYaml(toClash(reality)).proxies[0];
    expect(grpcProxy["grpc-opts"]).toEqual({ "grpc-service-name": "gsvc" });
  });

  it("carries the remark to the proxy name", () => {
    const node = parseAll(MULTI)[2];
    expect(loadYaml(toClash(node)).proxies[0].name).toBe("trojan-node");
  });

  it("throws for a protocol outside the UNM Protocol enum", () => {
    const fake = /** @type {any} */ ({ protocol: "made-up", address: "h", port: 1 });
    expect(() => toClash(fake)).toThrow(/CONVERT_UNSUPPORTED/);
  });

  it("accepts a freshly built node (not only parser output)", () => {
    const node = createNode(/** @type {any} */ ({
      sourceType: "vless-url", protocol: "vless", address: "h.example.com", port: 443,
      network: "ws", security: "tls", uuid: "u-1", sni: "h.example.com", path: "/p",
    }));
    expect(loadYaml(toClash(node))).toEqual({
      proxies: [{
        type: "vless", server: "h.example.com", port: 443, uuid: "u-1",
        network: "ws", "ws-opts": { path: "/p" },
        tls: true, servername: "h.example.com",
      }],
    });
  });
});
