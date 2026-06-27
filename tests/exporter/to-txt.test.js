/**
 * TXT Export tests (08-EXPORT_ENGINE §2, ADR-004). `exportTxt` is a thin
 * batching layer over the Converter Engine's existing `toUrl`/`convertBatch`
 * (ADR-012) — these tests pin that it reuses the real serializer (matches
 * calling `toUrl` directly) rather than re-deriving URL formatting, joins
 * with one node per line, and surfaces (never silently drops) any node the
 * `url` format cannot represent.
 */
import { describe, it, expect } from "vitest";
import { exportTxt } from "../../core/exporter/to-txt.js";
import { toUrl } from "../../core/converter/to-url.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
});
const trojan = createNode({
  sourceType: "trojan-url", protocol: "trojan", address: "b.example.com", port: 8443, password: "pw",
});

describe("exportTxt", () => {
  it("joins one URL per line, in node order, for a Mixed List (doc 08 §2)", () => {
    const { content, skipped } = exportTxt([vless, trojan]);
    expect(content).toBe(`${toUrl(vless)}\n${toUrl(trojan)}`);
    expect(skipped).toEqual([]);
  });

  it("returns empty content and skipped for an empty node list", () => {
    expect(exportTxt([])).toEqual({ content: "", skipped: [] });
  });

  it("surfaces (never silently drops) a node the url format cannot represent", () => {
    const fake = /** @type {any} */ ({ nodeId: "fake-id", protocol: "made-up" });
    const { content, skipped } = exportTxt([vless, fake]);
    expect(content).toBe(toUrl(vless));
    expect(skipped).toEqual([{ nodeId: "fake-id", protocol: "made-up", reason: 'protocol "made-up" is not supported by TXT export' }]);
  });
});
