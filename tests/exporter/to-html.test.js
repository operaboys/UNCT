// @vitest-environment jsdom
/**
 * HTML Report Export tests (08-EXPORT_ENGINE §8, §11 Security Layer
 * MANDATORY, ADR-018). Needs the jsdom environment because `dompurify`
 * detects `window`/`document` at import time (the same reason
 * `tests/store/settings-state.test.js` and `tests/ui/store/
 * use-store-selector.test.js` already use this pragma).
 */
import { describe, it, expect } from "vitest";
import { exportHtmlReport, EXPORT_REPORT_VERSION } from "../../core/exporter/to-html.js";
import { UNM_SCHEMA_VERSION } from "../../core/unm/registry/schema-registry.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
  remark: "my server",
});

describe("exportHtmlReport", () => {
  it("renders Summary from the node's own fields, escaping nothing away", () => {
    const { content } = exportHtmlReport([vless]);
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("vless");
    expect(content).toContain("a.example.com");
    expect(content).toContain("443");
    expect(content).toContain("my server");
    expect(content).toContain(`Node Count: 1`);
    expect(content).toContain(UNM_SCHEMA_VERSION);
    expect(content).toContain(EXPORT_REPORT_VERSION);
  });

  it("shows 'Not analyzed yet' for Analysis/Security/Compatibility when no bundle is passed, and never fabricates an average score", () => {
    const { content } = exportHtmlReport([vless]);
    expect(content).toContain("Not analyzed yet.");
    expect(content).toContain("Average Security Score: Not analyzed yet.");
  });

  it("renders real analyzer data (Analysis/Security Report/Compatibility Report) when a bundle is passed", () => {
    const analysisByNodeId = /** @type {any} */ ({
      [vless.nodeId]: {
        completeness: { completenessScore: 75, missingFields: ["sni"], presentOptionalFields: [] },
        protocol: { protocol: "vless", recognized: true },
        network: { network: "tcp", protocol: "vless", compatible: true, supportedNetworks: ["tcp", "ws"] },
        tls: { securityType: "none", applicable: false, coherent: true, knownFingerprint: null, issues: [] },
        reality: { applicable: false, compatible: true, pbkPlausible: null, sidPlausible: null, issues: [] },
        security: { securityScore: 60, issues: ["No TLS encryption configured"] },
      },
    });
    const { content } = exportHtmlReport([vless], analysisByNodeId);
    expect(content).toContain("75/100");
    expect(content).toContain("60/100");
    expect(content).toContain("No TLS encryption configured");
    expect(content).toContain("Compatible");
    expect(content).toContain("tcp, ws");
    expect(content).toContain("Average Security Score: 60.0/100");
    expect(content).not.toContain("Not analyzed yet.");
  });

  it("renders metadata.warnings and metadata.recoveryActions verbatim, never inventing a recommendation", () => {
    const withMetadata = createNode({
      sourceType: "vless-url", protocol: "vless", address: "b.example.com", port: 443, uuid: "uuid-2",
      metadata: /** @type {any} */ ({
        warnings: ["port is a non-standard value"],
        recoveryActions: ["normalized network from 'h2' to 'http'"],
      }),
    });
    const { content } = exportHtmlReport([withMetadata]);
    expect(content).toContain("port is a non-standard value");
    // DOMPurify's final pass parses+re-serializes the document, so the
    // redundant quote-entities escapeHtml() added come back out as literal
    // quotes — harmless in a text node (only `&`/`</`/`>` are re-escaped,
    // since those are what could otherwise reopen markup).
    expect(content).toContain("normalized network from 'h2' to 'http'");
  });

  it("never lets a raw <script>, onerror=, or unknown-tag-shaped remark survive unescaped/unsanitized", () => {
    const malicious = createNode({
      sourceType: "vless-url", protocol: "vless", address: "c.example.com", port: 443, uuid: "uuid-3",
      remark: '<script>alert(1)</script><img src=x onerror="alert(2)"> see <readme> & more',
    });
    const { content } = exportHtmlReport([malicious]);

    // No live, parseable <script> start tag or <img onerror=...> element —
    // both survive only as escaped, inert text (the literal substrings
    // "alert(1)"/"onerror=" are harmless once they can never be parsed back
    // into markup or an attribute).
    expect(content).not.toContain("<script>");
    expect(content).not.toContain("<img");
    expect(content).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // escapeHtml() preserves the literal text — including the "<readme>"-shaped
    // substring — as harmless entities, rather than DOMPurify's per-field
    // tag-stripping silently deleting it (Rule 9: never lose real data).
    expect(content).toContain("&lt;readme&gt;");
    expect(content).toContain("&amp; more");
  });

  it("returns just { content } with no skipped list, the same shape exportCsv uses (no per-node serializer dependency)", () => {
    const result = exportHtmlReport([vless]);
    expect(Object.keys(result)).toEqual(["content"]);
  });

  it("still produces a well-formed, sanitized document for an empty node list", () => {
    const { content } = exportHtmlReport([]);
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("Node Count: 0");
    expect(content).toContain("Average Security Score: Not analyzed yet.");
  });
});
