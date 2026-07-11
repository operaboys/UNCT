/**
 * Protocol Analyzer tests (06-ANALYZER_ENGINE §1.1).
 *
 * Covers the module's narrow contract:
 *  1. it confirms `protocol` straight from UNM data (never raw file/Format),
 *  2. every known protocol is recognized,
 *  3. an unrecognized value crossing the boundary is flagged, not trusted.
 */
import { describe, it, expect } from "vitest";
import { analyzeProtocol } from "../../core/analyzer/core/protocol-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";
import { PROTOCOLS } from "../../core/unm/schema/enums.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    network: "tcp", security: "none", ...overrides,
  }));
}

describe("analyzeProtocol — confirms protocol from UNM data", () => {
  it("echoes node.protocol verbatim", () => {
    expect(analyzeProtocol(node({ protocol: "trojan", sourceType: "trojan-url" })).protocol).toBe("trojan");
  });

  it.each(PROTOCOLS)("recognizes %s as a known protocol", (protocol) => {
    const sourceTypeByProtocol = /** @type {Record<string, string>} */ ({
      vless: "vless-url", vmess: "vmess-url", trojan: "trojan-url", shadowsocks: "ss-url",
      hysteria2: "hysteria2-url", tuic: "tuic-url", wireguard: "wireguard-config",
    });
    const result = analyzeProtocol(node({ protocol, sourceType: sourceTypeByProtocol[protocol] }));
    expect(result).toEqual({ protocol, recognized: true });
  });

  it("flags an unrecognized protocol value instead of trusting it", () => {
    // Simulates UNM data crossing a boundary outside the Parser's own
    // guarantee (createNode itself would reject this at construction).
    const result = analyzeProtocol(/** @type {any} */ ({ protocol: "not-a-real-protocol" }));
    expect(result).toEqual({ protocol: "not-a-real-protocol", recognized: false });
  });

  it("never inspects raw file/format data — only the UNMNode's protocol field", () => {
    const result = analyzeProtocol(node({ protocol: "vless", sourceType: "xray-json" }));
    expect(result).toEqual({ protocol: "vless", recognized: true });
  });
});
