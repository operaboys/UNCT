/**
 * CSV Export tests (08-EXPORT_ENGINE §5, ADR-004). `exportCsv` has no
 * existing Converter Engine serializer to reuse (CSV has no per-node "config"
 * shape) — these tests pin the fixed column order, RFC 4180 escaping (comma/
 * quote/newline), the `remark` fallback to `""`, and that `overallValid`
 * renders as the literal Validation Engine boolean, never a re-derived label.
 */
import { describe, it, expect } from "vitest";
import { exportCsv } from "../../core/exporter/to-csv.js";
import { createNode, withValidation } from "../../core/unm/create-node.js";

const HEADER = "Protocol,Address,Port,Remark,Security,Network,Validation Status";

const vless = createNode({
  sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
  remark: "My Node",
});

describe("exportCsv", () => {
  it("emits the header row, then one row per node in the fixed column order (doc 08 §5)", () => {
    const valid = withValidation(vless, { ...vless.validation, overallValid: true });
    const csv = exportCsv([valid]);
    expect(csv).toBe([
      HEADER,
      `vless,a.example.com,443,My Node,none,tcp,${String(valid.validation.overallValid)}`,
    ].join("\n"));
  });

  it("returns just the header row for an empty node list", () => {
    expect(exportCsv([])).toBe(HEADER);
  });

  it("falls back to an empty string for a node with no remark", () => {
    const noRemark = createNode({
      sourceType: "trojan-url", protocol: "trojan", address: "b.example.com", port: 8443, password: "pw",
    });
    const csv = exportCsv([noRemark]);
    expect(csv.split("\n")[1]).toBe(`trojan,b.example.com,8443,,none,tcp,${String(noRemark.validation.overallValid)}`);
  });

  it("renders validation.overallValid as the literal Validation Engine boolean, never a re-derived label (Rule 11)", () => {
    const invalid = createNode({
      sourceType: "trojan-url", protocol: "trojan", address: "c.example.com", port: 8443, password: "pw",
    });
    expect(invalid.validation.overallValid).toBe(false);
    expect(exportCsv([invalid]).split("\n")[1]).toContain(",false");
  });

  it("quotes a field containing a comma, doubling embedded quotes (RFC 4180)", () => {
    const withComma = createNode({
      sourceType: "trojan-url", protocol: "trojan", address: "d.example.com", port: 8443, password: "pw",
      remark: 'He said "hi", then left',
    });
    expect(exportCsv([withComma]).split("\n")[1]).toBe(
      `trojan,d.example.com,8443,"He said ""hi"", then left",none,tcp,${String(withComma.validation.overallValid)}`,
    );
  });

  it("quotes a field containing a newline (RFC 4180)", () => {
    const withNewline = createNode({
      sourceType: "trojan-url", protocol: "trojan", address: "e.example.com", port: 8443, password: "pw",
      remark: "line one\nline two",
    });
    expect(exportCsv([withNewline])).toBe(
      `${HEADER}\ntrojan,e.example.com,8443,"line one\nline two",none,tcp,${String(withNewline.validation.overallValid)}`,
    );
  });
});
