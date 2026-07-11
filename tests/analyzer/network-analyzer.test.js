/**
 * Network Analyzer tests (06-ANALYZER_ENGINE §1.4).
 *
 * Covers:
 *  1. stream-transport protocols (vless/vmess/trojan) accept the full set,
 *  2. self-transporting protocols (hy2/tuic/wireguard) accept only tcp,
 *  3. an incompatible transport is flagged (compatibility, not validity),
 *  4. real parsed nodes (which default to tcp) never false-positive.
 */
import { describe, it, expect } from "vitest";
import { analyzeNetwork, supportedNetworks } from "../../core/analyzer/core/network-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", ...overrides,
  }));
}

describe("supportedNetworks — the compatibility matrix is protocol-driven", () => {
  it("gives vless/vmess/trojan the full stream-transport set", () => {
    for (const protocol of /** @type {const} */ (["vless", "vmess", "trojan"])) {
      expect(supportedNetworks(protocol)).toEqual(
        expect.arrayContaining(["tcp", "ws", "grpc", "http-upgrade", "kcp", "xhttp", "quic"]),
      );
    }
  });

  it("limits self-transporting protocols (hy2/tuic/wireguard) to tcp only", () => {
    expect(supportedNetworks("hysteria2")).toEqual(["tcp"]);
    expect(supportedNetworks("tuic")).toEqual(["tcp"]);
    expect(supportedNetworks("wireguard")).toEqual(["tcp"]);
  });

  it("allows shadowsocks tcp natively plus ws/grpc (plugin transports)", () => {
    expect(supportedNetworks("shadowsocks")).toEqual(expect.arrayContaining(["tcp", "ws", "grpc"]));
    expect(supportedNetworks("shadowsocks")).not.toContain("kcp");
  });

  it("returns an empty set for an unrecognized protocol", () => {
    expect(supportedNetworks(/** @type {any} */ ("not-a-protocol"))).toEqual([]);
  });
});

describe("analyzeNetwork — compatible vs incompatible transport for the protocol", () => {
  it("marks ws over vless compatible", () => {
    const result = analyzeNetwork(node({ protocol: "vless", network: "ws" }));
    expect(result.compatible).toBe(true);
    expect(result).toMatchObject({ network: "ws", protocol: "vless" });
  });

  it("marks ws over hysteria2 INCOMPATIBLE (self-transporting protocol)", () => {
    const result = analyzeNetwork(node({
      protocol: "hysteria2", sourceType: "hysteria2-url", network: "ws",
    }));
    expect(result.compatible).toBe(false);
    expect(result.supportedNetworks).toEqual(["tcp"]);
  });

  it("does not false-positive on a real hy2/tuic/wireguard node (defaults to tcp)", () => {
    // Parsers leave these at DEFAULT_NETWORK "tcp" — must stay compatible.
    expect(analyzeNetwork(node({ protocol: "hysteria2", sourceType: "hysteria2-url" })).compatible).toBe(true);
    expect(analyzeNetwork(node({ protocol: "tuic", sourceType: "tuic-url" })).compatible).toBe(true);
    expect(analyzeNetwork(node({ protocol: "wireguard", sourceType: "wireguard-config" })).compatible).toBe(true);
  });

  it("echoes node.network and node.protocol verbatim", () => {
    const result = analyzeNetwork(node({ protocol: "trojan", sourceType: "trojan-url", network: "grpc" }));
    expect(result.network).toBe("grpc");
    expect(result.protocol).toBe("trojan");
  });
});
