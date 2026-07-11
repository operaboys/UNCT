/**
 * Excel Export tests (08-EXPORT_ENGINE §12, P12-3, ADR-023).
 * XLSX files are ZIP archives — validated via magic bytes (PK header).
 */
import { describe, it, expect } from "vitest";
import { exportExcel } from "../../core/exporter/to-excel.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url",
  protocol: "vless",
  address: "a.example.com",
  port: 443,
  security: "tls",
  network: "ws",
  remark: "my-node",
});

const trojan = createNode({
  sourceType: "xray-json",
  protocol: "trojan",
  address: "b.example.com",
  port: 8443,
  security: "tls",
  network: "tcp",
});

describe("exportExcel", () => {
  it("returns { content: Uint8Array } (async)", async () => {
    const { content } = await exportExcel([vless]);
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
  });

  it("output starts with PK magic bytes (XLSX is a ZIP)", async () => {
    const { content } = await exportExcel([vless]);
    // ZIP magic: 0x50 0x4B 0x03 0x04
    expect(content[0]).toBe(0x50); // P
    expect(content[1]).toBe(0x4B); // K
  });

  it("works with an empty node list", async () => {
    const { content } = await exportExcel([]);
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
    // Still a valid ZIP/XLSX
    expect(content[0]).toBe(0x50);
    expect(content[1]).toBe(0x4B);
  });

  it("works with multiple nodes", async () => {
    const { content } = await exportExcel([vless, trojan]);
    expect(content).toBeInstanceOf(Uint8Array);
    expect(content.length).toBeGreaterThan(0);
  });

  it("returns a larger file for more nodes", async () => {
    const { content: small } = await exportExcel([vless]);
    const { content: large } = await exportExcel([vless, trojan]);
    expect(large.length).toBeGreaterThan(small.length);
  });

  it("exportExcel is a function returning a Promise", () => {
    const result = exportExcel([vless]);
    expect(result).toBeInstanceOf(Promise);
    return result;
  });
});
