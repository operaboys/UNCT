/**
 * Unit tests for the plugin-parser fallback tier: `core/plugin/
 * parse-with-plugins.js` (the mechanism) and `core/plugin/app-plugins.js`
 * (the real app's plugin registry, both new Custom Parsers loaded via
 * createPluginLoader/createPluginRegistry — never via
 * core/parser/factory.js directly, per Phase 11's ADR-020 design).
 */
import { describe, it, expect } from "vitest";
import { createPluginRegistry } from "../../core/plugin/registry.js";
import { createPluginLoader } from "../../core/plugin/loader.js";
import { parseWithPlugins } from "../../core/plugin/parse-with-plugins.js";
import { appPluginRegistry } from "../../core/plugin/app-plugins.js";
import { sip008Parser } from "../../plugins/sip008-parser/index.js";
import { hysteria2ConfigParser } from "../../plugins/hysteria2-config-parser/index.js";
import { sip008Exporter } from "../../plugins/sip008-exporter/index.js";
import { parseAndValidate } from "../../core/parser/parse-and-validate.js";

const REAL_SIP008 = JSON.stringify({
  version: 1,
  servers: [{ server: "ss.example.com", server_port: 8888, password: "pw", method: "aes-256-gcm" }],
});
const REAL_HY2_CONFIG = JSON.stringify({ server: "hy2.example.com:443", auth: "pw" });

describe("core/plugin/app-plugins.js — real app registry", () => {
  it("both real Custom Parsers are registered, loaded via createPluginLoader (not the core factory)", () => {
    expect(appPluginRegistry.listParsers().sort()).toEqual(["hysteria2-config-parser", "sip008-parser"]);
    expect(appPluginRegistry.getParser("sip008-parser")).toBe(sip008Parser);
    expect(appPluginRegistry.getParser("hysteria2-config-parser")).toBe(hysteria2ConfigParser);
  });

  it("does NOT load the fictional example-parser plugin into the real app registry", () => {
    expect(appPluginRegistry.listParsers()).not.toContain("example-csv");
  });

  it("the real Custom Exporter is also registered, loaded via createPluginLoader", () => {
    expect(appPluginRegistry.listExporters()).toEqual(["sip008-exporter"]);
    expect(appPluginRegistry.getExporter("sip008-exporter")).toBe(sip008Exporter);
  });
});

describe("parseWithPlugins", () => {
  it("returns null when no registered plugin parser matches", () => {
    const registry = createPluginRegistry();
    const loader = createPluginLoader(registry);
    loader.load({ id: "sip008-parser", type: "parser", implementation: sip008Parser });
    expect(parseWithPlugins("totally unrelated plain text", registry)).toBeNull();
  });

  it("resolves a SIP008 document through the plugin registry", () => {
    const registry = createPluginRegistry();
    const loader = createPluginLoader(registry);
    loader.load({ id: "sip008-parser", type: "parser", implementation: sip008Parser });
    const result = parseWithPlugins(REAL_SIP008, registry);
    expect(result).not.toBeNull();
    expect(result?.parserName).toBe("sip008-parser");
    expect(result?.nodes).toHaveLength(1);
    expect(result?.nodes[0].protocol).toBe("shadowsocks");
  });

  it("picks the highest-confidence plugin when more than one is registered", () => {
    const result = parseWithPlugins(REAL_HY2_CONFIG, appPluginRegistry);
    expect(result?.parserName).toBe("hysteria2-config-parser");
    expect(result?.nodes[0].protocol).toBe("hysteria2");
  });
});

describe("parseAndValidate — real end-to-end fallback (main-thread path)", () => {
  it("parses a real SIP008 document that no core parser recognizes", () => {
    const result = parseAndValidate(REAL_SIP008);
    expect(result.parserName).toBe("sip008-parser");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].protocol).toBe("shadowsocks");
    expect(result.nodes[0].address).toBe("ss.example.com");
  });

  it("parses a real Hysteria2 native config that no core parser recognizes", () => {
    const result = parseAndValidate(REAL_HY2_CONFIG);
    expect(result.parserName).toBe("hysteria2-config-parser");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].protocol).toBe("hysteria2");
    expect(result.nodes[0].address).toBe("hy2.example.com");
  });

  it("still throws Unknown Format for input no core parser AND no plugin recognizes", () => {
    expect(() => parseAndValidate("complete garbage, not any known format {{{")).toThrow();
  });

  it("core parsers still take priority over plugins for formats they already own (Xray JSON)", () => {
    const xrayLike = JSON.stringify({
      outbounds: [{ protocol: "vless", settings: { vnext: [{ address: "a.com", port: 443, users: [{ id: "aaaaaaaa-bbbb-4ccc-8ddd-000000000000" }] }] }, streamSettings: { network: "tcp" } }],
    });
    const result = parseAndValidate(xrayLike);
    expect(result.parserName).toBe("xray");
  });
});
