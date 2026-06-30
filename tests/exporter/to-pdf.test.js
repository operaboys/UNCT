/**
 * PDF Export tests (08-EXPORT_ENGINE §12, P12-3, ADR-023).
 * Validates the custom zero-dependency PDF 1.4 generator via binary structure
 * checks — no PDF-parsing library is available in tests, so we inspect bytes
 * and text fragments that must appear in ASCII content streams.
 */
import { describe, it, expect } from "vitest";
import { exportPdf } from "../../core/exporter/to-pdf.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url",
  protocol: "vless",
  address: "a.example.com",
  port: 443,
  security: "tls",
  network: "ws",
  remark: "my-node",
  metadata: { parser: "UrlParser", confidence: 90, warnings: ["weak-tls"], recoveryActions: [], errors: [], originalMappings: {} },
});

const trojan = createNode({
  sourceType: "xray-json",
  protocol: "trojan",
  address: "b.example.com",
  port: 8443,
  security: "tls",
  network: "tcp",
});

/** Decode a Uint8Array as a Latin-1 string (byte-for-byte, ignoring encoding). */
function decode(/** @type {Uint8Array} */ bytes) {
  return Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
}

describe("exportPdf", () => {
  it("returns { content: Uint8Array }", () => {
    const { content } = exportPdf([vless]);
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
  });

  it("starts with PDF magic bytes %PDF-1.4", () => {
    const { content } = exportPdf([vless]);
    // %PDF = 0x25 0x50 0x44 0x46
    expect(content[0]).toBe(0x25); // %
    expect(content[1]).toBe(0x50); // P
    expect(content[2]).toBe(0x44); // D
    expect(content[3]).toBe(0x46); // F
  });

  it("ends with %%EOF marker", () => {
    const { content } = exportPdf([vless]);
    const text = decode(content);
    expect(text).toContain("%%EOF");
  });

  it("contains xref cross-reference table", () => {
    const { content } = exportPdf([vless]);
    const text = decode(content);
    expect(text).toContain("xref");
    expect(text).toContain("startxref");
  });

  it("contains PDF Catalog and Pages objects", () => {
    const { content } = exportPdf([vless]);
    const text = decode(content);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/Type /Pages");
    expect(text).toContain("/Type /Page");
  });

  it("embeds Helvetica as the document font", () => {
    const { content } = exportPdf([vless]);
    const text = decode(content);
    expect(text).toContain("/BaseFont /Helvetica");
  });

  it("works with an empty node list", () => {
    const { content } = exportPdf([]);
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
    const text = decode(content);
    expect(text).toContain("%PDF-1.4");
    expect(text).toContain("%%EOF");
  });

  it("contains node protocol in the content stream", () => {
    const { content } = exportPdf([vless]);
    const text = decode(content);
    expect(text).toContain("vless");
  });

  it("contains node address in the content stream", () => {
    const { content } = exportPdf([vless]);
    const text = decode(content);
    expect(text).toContain("a.example.com");
  });

  it("contains node warnings in the content stream", () => {
    const { content } = exportPdf([vless]);
    const text = decode(content);
    expect(text).toContain("weak-tls");
  });

  it("handles multiple nodes without throwing", () => {
    expect(() => exportPdf([vless, trojan])).not.toThrow();
    const { content } = exportPdf([vless, trojan]);
    const text = decode(content);
    expect(text).toContain("vless");
    expect(text).toContain("trojan");
  });

  it("converts non-ASCII characters to '?' in content streams", () => {
    const unicode = createNode({
      sourceType: "vless-url",
      protocol: "vless",
      address: "تست.example.com",
      port: 443,
      security: "none",
      network: "tcp",
    });
    const { content } = exportPdf([unicode]);
    const text = decode(content);
    // The address with Arabic characters must be sanitized — no raw multi-byte sequences
    // and the content stream should contain '?' in place of non-ASCII chars
    expect(text).toContain("?.example.com");
    // Verify the PDF is still structurally valid
    expect(text).toContain("%%EOF");
  });

  it("parens and backslashes in values are escaped", () => {
    const tricky = createNode({
      sourceType: "vless-url",
      protocol: "vless",
      address: "host.example.com",
      port: 443,
      security: "none",
      network: "tcp",
      remark: "a(b)c\\d",
    });
    const { content } = exportPdf([tricky]);
    const text = decode(content);
    // PDF literal string escaping must be present
    expect(text).toContain("a\\(b\\)c\\\\d");
  });

  it("produces a non-empty file for a 60-node list (multi-page)", () => {
    const nodes = Array.from({ length: 60 }, (_, i) =>
      createNode({
        sourceType: "vless-url",
        protocol: "vless",
        address: `node${i}.example.com`,
        port: 443,
        security: "tls",
        network: "tcp",
      }),
    );
    const { content } = exportPdf(nodes);
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
    const text = decode(content);
    // Multi-page PDF should have more than one /Type /Page occurrence
    const pageCount = (text.match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThan(1);
  });
});
