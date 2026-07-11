/**
 * Unit tests for core/plugin/loader.js (ADR-020 §3–4, Phase 11).
 *
 * Covers:
 *  1. Valid parser plugin → loads successfully, returns PluginContext.
 *  2. Valid exporter plugin → loads successfully, returns PluginContext.
 *  3. Parser contract violation (missing required method) → throws at load time.
 *  4. Exporter contract violation (missing export method) → throws at load time.
 *  5. Invalid descriptor shape → throws at load time.
 *  6. Returned PluginContext is frozen and contains only the plugin's own
 *     identity — no reference to the registry (Rule 12: no cross-plugin path).
 *  7. PluginContext does NOT expose the registry object.
 *  8. Example CSV parser plugin loads and round-trips through normalizeMany().
 */
import { describe, it, expect } from "vitest";
import { createPluginRegistry } from "../../core/plugin/registry.js";
import { createPluginLoader } from "../../core/plugin/loader.js";
import { exampleCsvParser } from "../../plugins/example-parser/index.js";

function makeEnv() {
  const registry = createPluginRegistry();
  const loader = createPluginLoader(registry);
  return { registry, loader };
}

/** @returns {import("../../core/types/parser").BaseParser} */
function validParser() {
  return {
    detect: () => 60,
    parse: () => ({ fields: { x: 1 } }),
    validateStructure: () => ({
      addressValid: true, portValid: true, uuidValid: null, realityValid: null,
      tlsValid: null, alpnValid: null, pathValid: null, hostValid: null, overallValid: true,
    }),
    normalize: (e) => { throw new Error("stub"); },
    recover: () => null,
  };
}

/** @returns {import("../../core/plugin/exporter-contract").ExporterPlugin} */
function validExporter() {
  return {
    export: (nodes) => ({ content: nodes.map(() => "line").join("\n"), skipped: [] }),
    label: "Fake TXT",
    mimeType: "text/plain",
    extension: ".txt",
  };
}

describe("PluginLoader — valid parser plugin", () => {
  it("loads and returns a PluginContext with pluginId and pluginType", () => {
    const { loader } = makeEnv();
    const ctx = loader.load({ id: "fake-parser", type: "parser", implementation: validParser() });
    expect(ctx.pluginId).toBe("fake-parser");
    expect(ctx.pluginType).toBe("parser");
  });

  it("stores the parser in the registry after successful load", () => {
    const { registry, loader } = makeEnv();
    const impl = validParser();
    loader.load({ id: "test-p", type: "parser", implementation: impl });
    expect(registry.getParser("test-p")).toBe(impl);
  });
});

describe("PluginLoader — valid exporter plugin", () => {
  it("loads and returns a PluginContext", () => {
    const { loader } = makeEnv();
    const ctx = loader.load({ id: "fake-exporter", type: "exporter", implementation: validExporter() });
    expect(ctx.pluginId).toBe("fake-exporter");
    expect(ctx.pluginType).toBe("exporter");
  });

  it("stores the exporter in the registry after successful load", () => {
    const { registry, loader } = makeEnv();
    const impl = validExporter();
    loader.load({ id: "test-e", type: "exporter", implementation: impl });
    expect(registry.getExporter("test-e")).toBe(impl);
  });
});

describe("PluginLoader — parser contract violation at load time", () => {
  it("throws when a required BaseParser method is missing", () => {
    const { loader } = makeEnv();
    const bad = { detect: () => 50 }; // missing parse, validateStructure, normalize, recover
    expect(() => loader.load({ id: "bad", type: "parser", implementation: /** @type {any} */ (bad) }))
      .toThrow(/missing required method/);
  });

  it("throws when isAsync=true but parseAsync is absent", () => {
    const { loader } = makeEnv();
    const bad = { ...validParser(), isAsync: true }; // no parseAsync
    expect(() => loader.load({ id: "bad-async", type: "parser", implementation: /** @type {any} */ (bad) }))
      .toThrow(/parseAsync/);
  });
});

describe("PluginLoader — exporter contract violation at load time", () => {
  it("throws when export() method is missing", () => {
    const { loader } = makeEnv();
    const bad = { label: "No export method" };
    expect(() => loader.load({ id: "bad-exp", type: "exporter", implementation: /** @type {any} */ (bad) }))
      .toThrow(/missing required method/);
  });
});

describe("PluginLoader — invalid descriptor", () => {
  it("throws when id is empty", () => {
    const { loader } = makeEnv();
    expect(() => loader.load({ id: "", type: "parser", implementation: validParser() }))
      .toThrow(/non-empty string/);
  });

  it("throws when type is unknown", () => {
    const { loader } = makeEnv();
    expect(() => loader.load({ id: "x", type: /** @type {any} */ ("transformer"), implementation: /** @type {any} */ ({}) }))
      .toThrow(/must be "parser" or "exporter"/);
  });

  it("throws when descriptor itself is null", () => {
    const { loader } = makeEnv();
    expect(() => loader.load(/** @type {any} */ (null))).toThrow(/must be an object/);
  });
});

describe("PluginLoader — Rule 12 sandbox: PluginContext has no registry reference", () => {
  it("returned context is frozen", () => {
    const { loader } = makeEnv();
    const ctx = loader.load({ id: "r12", type: "parser", implementation: validParser() });
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it("context contains only pluginId and pluginType — no registry, no other plugin data", () => {
    const { loader } = makeEnv();
    loader.load({ id: "p-alpha", type: "parser", implementation: validParser() });
    const ctx = loader.load({ id: "p-beta", type: "parser", implementation: validParser() });
    // p-beta's context must not expose p-alpha's implementation (Rule 12).
    const keys = Object.keys(ctx);
    expect(keys).toEqual(expect.arrayContaining(["pluginId", "pluginType"]));
    // No registry-like property accessible through the context.
    expect(ctx).not.toHaveProperty("registry");
    expect(ctx).not.toHaveProperty("getParser");
    expect(ctx).not.toHaveProperty("listParsers");
  });
});

describe("PluginLoader — example CSV parser plugin end-to-end", () => {
  it("loads the example parser without touching core/parser/", () => {
    const { registry, loader } = makeEnv();
    expect(() => loader.load({ id: "example-csv", type: "parser", implementation: exampleCsvParser }))
      .not.toThrow();
    expect(registry.listParsers()).toContain("example-csv");
  });

  it("detect() returns 85 for a UNCT-CSV input, 0 for anything else", () => {
    const csvInput = "# unct-csv v1\nprotocol,address,port,credential,remark\ntrojan,host.com,443,pass,\n";
    expect(exampleCsvParser.detect(csvInput)).toBe(85);
    expect(exampleCsvParser.detect("vless://uuid@host:443")).toBe(0);
  });

  it("normalizeMany() expands CSV rows into UNMNodes without touching core/parser/", () => {
    const csvInput = [
      "# unct-csv v1",
      "protocol,address,port,credential,remark",
      "trojan,plugin-host.com,443,secretpass,my-node",
      "trojan,plugin-host2.com,8443,pass2,other",
    ].join("\n");
    const extraction = exampleCsvParser.parse(csvInput);
    const nodes = /** @type {any} */ (exampleCsvParser).normalizeMany(extraction);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].protocol).toBe("trojan");
    expect(nodes[0].address).toBe("plugin-host.com");
    expect(nodes[0].port).toBe(443);
    expect(nodes[0].password).toBe("secretpass");
    expect(nodes[1].port).toBe(8443);
  });

  it("normalize() throws (producesMany parser, Rule 9 — no silent data loss)", () => {
    const extraction = exampleCsvParser.parse("# unct-csv v1\ntrojan,h.com,443,p,\n");
    expect(() => exampleCsvParser.normalize(extraction)).toThrow(/producesMany/);
  });
});
