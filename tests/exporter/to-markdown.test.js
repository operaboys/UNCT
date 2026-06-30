/**
 * Markdown Export tests (08-EXPORT_ENGINE §12, P12-3, ADR-023).
 */
import { describe, it, expect } from "vitest";
import { exportMarkdown } from "../../core/exporter/to-markdown.js";
import { createNode } from "../../core/unm/create-node.js";
import { UNM_SCHEMA_VERSION } from "../../core/unm/registry/schema-registry.js";

const vless = createNode({
  sourceType: "vless-url",
  protocol: "vless",
  address: "a.example.com",
  port: 443,
  uuid: "c3f5db00-1234-4abc-8def-abcdef012345",
  security: "tls",
  network: "ws",
  remark: "my-node",
  metadata: { parser: "UrlParser", confidence: 90, warnings: ["warn1"], recoveryActions: ["fix-it"], errors: [], originalMappings: {} },
});

const trojan = createNode({
  sourceType: "xray-json",
  protocol: "trojan",
  address: "b.example.com",
  port: 8443,
  password: "secret",
  security: "tls",
  network: "tcp",
});

/** @type {import("../../core/analyzer/analyze-node.js").AnalysisBundle} */
const fakeBundle = {
  completeness: /** @type {any} */ ({ completenessScore: 80 }),
  protocol: /** @type {any} */ ({ recognized: true }),
  network: /** @type {any} */ ({ compatible: true, supportedNetworks: ["ws", "tcp"] }),
  tls: /** @type {any} */ ({}),
  reality: /** @type {any} */ ({ applicable: false, compatible: false, issues: [] }),
  security: /** @type {any} */ ({ securityScore: 75, issues: ["Weak cipher"] }),
  compatibility: /** @type {any} */ ({}),
  cloudflare: /** @type {any} */ ({}),
  cleanIp: /** @type {any} */ ({}),
  worker: /** @type {any} */ ({}),
};

describe("exportMarkdown", () => {
  it("returns { content: string }", () => {
    const { content } = exportMarkdown([vless]);
    expect(typeof content).toBe("string");
    expect(content.length).toBeGreaterThan(0);
  });

  it("starts with # UNCT Export Report header", () => {
    const { content } = exportMarkdown([vless]);
    expect(content.startsWith("# UNCT Export Report")).toBe(true);
  });

  it("contains UNM version in header", () => {
    const { content } = exportMarkdown([vless]);
    expect(content).toContain(UNM_SCHEMA_VERSION);
  });

  it("works with an empty node list", () => {
    const { content } = exportMarkdown([]);
    expect(typeof content).toBe("string");
    expect(content).toContain("# UNCT Export Report");
    expect(content).toContain("Node Count: 0");
  });

  it("contains protocol and address for each node", () => {
    const { content } = exportMarkdown([vless, trojan]);
    expect(content).toContain("vless");
    expect(content).toContain("a.example.com");
    expect(content).toContain("trojan");
    expect(content).toContain("b.example.com");
  });

  it("uses remark in node heading when present", () => {
    const { content } = exportMarkdown([vless]);
    expect(content).toContain("my-node");
  });

  it("falls back to address:port in heading when remark absent", () => {
    const { content } = exportMarkdown([trojan]);
    expect(content).toContain("b.example.com:8443");
  });

  it("renders node warnings", () => {
    const { content } = exportMarkdown([vless]);
    expect(content).toContain("warn1");
  });

  it("renders recovery actions", () => {
    const { content } = exportMarkdown([vless]);
    expect(content).toContain("fix-it");
  });

  it("shows 'None.' list when warnings are empty", () => {
    const { content } = exportMarkdown([trojan]);
    expect(content).toContain("_None._");
  });

  it("shows 'Not analyzed yet.' when no bundle provided", () => {
    const { content } = exportMarkdown([vless]);
    expect(content).toContain("_Not analyzed yet._");
  });

  it("renders analysis scores when bundle provided", () => {
    const { content } = exportMarkdown([vless], { [vless.nodeId]: fakeBundle });
    expect(content).toContain("80/100");
    expect(content).toContain("75/100");
  });

  it("renders security issues when bundle provided", () => {
    const { content } = exportMarkdown([vless], { [vless.nodeId]: fakeBundle });
    expect(content).toContain("Weak cipher");
  });

  it("renders network compatibility when bundle provided", () => {
    const { content } = exportMarkdown([vless], { [vless.nodeId]: fakeBundle });
    expect(content).toContain("Compatible");
    expect(content).toContain("ws");
  });

  it("includes horizontal rule separator between nodes", () => {
    const { content } = exportMarkdown([vless, trojan]);
    expect(content).toContain("---");
  });

  it("includes ## headings for each node", () => {
    const { content } = exportMarkdown([vless, trojan]);
    const h2count = (content.match(/^## /gm) ?? []).length;
    expect(h2count).toBe(2);
  });

  it("renders port as a number string in the table", () => {
    const { content } = exportMarkdown([vless]);
    expect(content).toContain("| 443 |");
  });

  it("pipe characters in values are escaped", () => {
    const nodeWithPipe = createNode({
      sourceType: "vless-url",
      protocol: "vless",
      address: "c|d.example.com",
      port: 443,
      security: "none",
      network: "tcp",
    });
    const { content } = exportMarkdown([nodeWithPipe]);
    expect(content).not.toMatch(/c\|d\.example\.com\s*\|/);
    expect(content).toContain("c\\|d.example.com");
  });

  it("shows node count matching the provided array", () => {
    const { content } = exportMarkdown([vless, trojan]);
    expect(content).toContain("Node Count: 2");
  });
});
