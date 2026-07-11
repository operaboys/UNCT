/**
 * QR Export tests (08-EXPORT_ENGINE §6, ADR-017). Verifies the wiring from
 * `toUrl()` through `uqr`'s `encode()` to a raw boolean matrix by re-deriving
 * the expected matrix from the library directly with the same URL string —
 * the same "this file packages, it never re-derives content" precedent
 * `to-zip.test.js` set, never re-testing `uqr`'s own QR algorithm.
 */
import { describe, it, expect } from "vitest";
import { encode } from "uqr";
import { exportQr } from "../../core/exporter/to-qr.js";
import { toUrl } from "../../core/converter/to-url.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
});
const shadowsocks = createNode({
  sourceType: "ss-url", protocol: "shadowsocks", address: "b.example.com", port: 8388,
  method: "aes-256-gcm", password: "pw",
});

describe("exportQr", () => {
  it("encodes each node's toUrl() string into a QR matrix matching uqr's encode() directly", () => {
    const { qrCodes, skipped } = exportQr([vless, shadowsocks]);
    expect(skipped).toEqual([]);
    expect(qrCodes).toHaveLength(2);

    [vless, shadowsocks].forEach((node, i) => {
      const expected = encode(toUrl(node), { ecc: "M" });

      expect(qrCodes[i].nodeId).toBe(node.nodeId);
      expect(qrCodes[i].protocol).toBe(node.protocol);
      expect(qrCodes[i].moduleCount).toBe(expected.size);
      expect(qrCodes[i].matrix).toEqual(expected.data);
    });
  });

  it("returns an empty list for an empty node list", () => {
    const { qrCodes, skipped } = exportQr([]);
    expect(qrCodes).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it("surfaces (never silently drops) a node outside toUrl()'s protocol scheme map", () => {
    const fake = /** @type {any} */ ({ nodeId: "fake-id", protocol: "made-up" });
    const { qrCodes, skipped } = exportQr([vless, fake]);
    expect(qrCodes).toHaveLength(1);
    expect(skipped).toEqual([
      { nodeId: "fake-id", protocol: "made-up", reason: 'protocol "made-up" is not supported by QR export' },
    ]);
  });
});
