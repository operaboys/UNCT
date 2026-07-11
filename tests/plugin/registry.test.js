/**
 * Unit tests for core/plugin/registry.js (ADR-020 §2, Phase 11).
 *
 * Covers:
 *  1. Independent instances: two registries share no state.
 *  2. Parser plugin registration/retrieval/listing.
 *  3. Exporter plugin registration/retrieval/listing.
 *  4. Duplicate ID rejection (separate namespace per type).
 *  5. get() on unknown ID throws rather than returning undefined.
 */
import { describe, it, expect } from "vitest";
import { createPluginRegistry } from "../../core/plugin/registry.js";

/** @returns {import("../../core/types/parser").BaseParser} */
function minimalParser() {
  return {
    detect: () => 50,
    parse: () => ({ fields: {} }),
    validateStructure: () => ({
      addressValid: true, portValid: true, uuidValid: null, realityValid: null,
      tlsValid: null, alpnValid: null, pathValid: null, hostValid: null, overallValid: true,
    }),
    normalize: () => { throw new Error("stub"); },
    recover: () => null,
  };
}

/** @returns {import("../../core/plugin/exporter-contract").ExporterPlugin} */
function minimalExporter() {
  return { export: () => ({ content: "", skipped: [] }) };
}

describe("createPluginRegistry — independent instances", () => {
  it("two registries do not share state", () => {
    const r1 = createPluginRegistry();
    const r2 = createPluginRegistry();
    r1.registerParser("p1", minimalParser());
    expect(r1.listParsers()).toEqual(["p1"]);
    expect(r2.listParsers()).toEqual([]);
  });
});

describe("createPluginRegistry — parser plugins", () => {
  it("registers a parser plugin and retrieves it", () => {
    const reg = createPluginRegistry();
    const impl = minimalParser();
    reg.registerParser("my-parser", impl);
    expect(reg.getParser("my-parser")).toBe(impl);
    expect(reg.listParsers()).toEqual(["my-parser"]);
  });

  it("throws on duplicate parser id", () => {
    const reg = createPluginRegistry();
    reg.registerParser("dup", minimalParser());
    expect(() => reg.registerParser("dup", minimalParser())).toThrow(/already registered/);
  });

  it("throws when getting an unknown parser id", () => {
    const reg = createPluginRegistry();
    expect(() => reg.getParser("ghost")).toThrow(/no parser plugin/);
  });
});

describe("createPluginRegistry — exporter plugins", () => {
  it("registers an exporter plugin and retrieves it", () => {
    const reg = createPluginRegistry();
    const impl = minimalExporter();
    reg.registerExporter("my-exporter", impl);
    expect(reg.getExporter("my-exporter")).toBe(impl);
    expect(reg.listExporters()).toEqual(["my-exporter"]);
  });

  it("throws on duplicate exporter id", () => {
    const reg = createPluginRegistry();
    reg.registerExporter("dup", minimalExporter());
    expect(() => reg.registerExporter("dup", minimalExporter())).toThrow(/already registered/);
  });

  it("throws when getting an unknown exporter id", () => {
    const reg = createPluginRegistry();
    expect(() => reg.getExporter("ghost")).toThrow(/no exporter plugin/);
  });

  it("parser and exporter namespaces are independent — same id allowed across types", () => {
    const reg = createPluginRegistry();
    reg.registerParser("shared-id", minimalParser());
    // Must NOT throw: "shared-id" in the exporter namespace is a different slot.
    expect(() => reg.registerExporter("shared-id", minimalExporter())).not.toThrow();
    expect(reg.listParsers()).toEqual(["shared-id"]);
    expect(reg.listExporters()).toEqual(["shared-id"]);
  });
});
