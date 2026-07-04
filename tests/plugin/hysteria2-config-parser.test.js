/**
 * Unit tests for the Hysteria2 native client config Custom Parser plugin
 * (plugins/hysteria2-config-parser/index.js) — the second of the two real
 * Custom Parsers resolving Phase 11's Blocked item.
 */
import { describe, it, expect } from "vitest";
import { hysteria2ConfigParser } from "../../plugins/hysteria2-config-parser/index.js";
import { normalizeAll } from "../../core/parser/factory.js";

const REAL_CONFIG = JSON.stringify({
  server: "hy2.example.com:443",
  auth: "yourpassword",
  tls: { sni: "hy2.example.com", insecure: false },
  bandwidth: { up: "10 mbps", down: "50 mbps" },
});

describe("hysteria2ConfigParser — BaseParser contract", () => {
  it("implements every required method (single-node parser)", () => {
    expect(typeof hysteria2ConfigParser.detect).toBe("function");
    expect(typeof hysteria2ConfigParser.parse).toBe("function");
    expect(typeof hysteria2ConfigParser.validateStructure).toBe("function");
    expect(typeof hysteria2ConfigParser.normalize).toBe("function");
    expect(typeof hysteria2ConfigParser.recover).toBe("function");
    expect(hysteria2ConfigParser.producesMany).toBeUndefined();
  });
});

describe("hysteria2ConfigParser.detect", () => {
  it("scores a real Hysteria2 native config highly", () => {
    expect(hysteria2ConfigParser.detect(REAL_CONFIG)).toBeGreaterThanOrEqual(90);
  });

  it("scores 0 for Xray JSON ('outbounds' present)", () => {
    expect(hysteria2ConfigParser.detect(JSON.stringify({ outbounds: [], server: "x:1" }))).toBe(0);
  });

  it("scores 0 for SIP008 ('servers' array present)", () => {
    expect(hysteria2ConfigParser.detect(JSON.stringify({ version: 1, servers: [] }))).toBe(0);
  });

  it("scores 0 when 'auth' is missing (too weak a signal alone)", () => {
    expect(hysteria2ConfigParser.detect(JSON.stringify({ server: "hy2.example.com:443" }))).toBe(0);
  });

  it("scores 0 when 'server' has no port", () => {
    expect(hysteria2ConfigParser.detect(JSON.stringify({ server: "hy2.example.com", auth: "pw" }))).toBe(0);
  });

  it("scores 0 for non-JSON input", () => {
    expect(hysteria2ConfigParser.detect("hy2://pw@host:443")).toBe(0);
  });
});

describe("hysteria2ConfigParser.parse + normalize — real config", () => {
  it("produces a single UNMNode with the right fields", () => {
    const extraction = hysteria2ConfigParser.parse(REAL_CONFIG);
    const [node] = normalizeAll(hysteria2ConfigParser, extraction);

    expect(node.protocol).toBe("hysteria2");
    expect(node.sourceType).toBe("subscription");
    expect(node.address).toBe("hy2.example.com");
    expect(node.port).toBe(443);
    expect(node.password).toBe("yourpassword");
    expect(node.sni).toBe("hy2.example.com");
    expect(node.metadata.parser).toBe("hysteria2-config-plugin");
    // Structurally inert defaults for this protocol (ADR-011) -- never set explicitly.
    expect(node.network).toBe("tcp");
    expect(node.security).toBe("none");
  });

  it("the produced node is frozen (Immutable, Rule 8)", () => {
    const extraction = hysteria2ConfigParser.parse(REAL_CONFIG);
    const [node] = normalizeAll(hysteria2ConfigParser, extraction);
    expect(Object.isFrozen(node)).toBe(true);
  });

  it("omits sni when tls.sni is absent", () => {
    const noSni = JSON.stringify({ server: "hy2.example.com:443", auth: "pw" });
    const extraction = hysteria2ConfigParser.parse(noSni);
    const [node] = normalizeAll(hysteria2ConfigParser, extraction);
    expect(node.sni).toBeUndefined();
  });

  it("throws on a server without a port", () => {
    const bad = JSON.stringify({ server: "hy2.example.com", auth: "pw" });
    expect(() => hysteria2ConfigParser.parse(bad)).toThrow(/PARSE_CONTRACT_VIOLATION/);
  });
});

describe("hysteria2ConfigParser.validateStructure", () => {
  it("overallValid is true for a valid host:port", () => {
    const extraction = hysteria2ConfigParser.parse(REAL_CONFIG);
    expect(hysteria2ConfigParser.validateStructure(extraction).overallValid).toBe(true);
  });

  it("overallValid is false when port is out of range", () => {
    expect(hysteria2ConfigParser.validateStructure({ fields: { host: "x", port: 70000 }, raw: "" }).overallValid).toBe(false);
  });
});

describe("hysteria2ConfigParser.recover", () => {
  it("recovers a config with a stray trailing comma", () => {
    const withTrailingComma = '{"server":"hy2.example.com:443","auth":"pw",}';
    const recovered = hysteria2ConfigParser.recover(withTrailingComma);
    expect(recovered).not.toBeNull();
    const [node] = normalizeAll(hysteria2ConfigParser, /** @type {any} */ (recovered));
    expect(node.address).toBe("hy2.example.com");
  });

  it("returns null when there is nothing to strip", () => {
    expect(hysteria2ConfigParser.recover("not json")).toBeNull();
  });
});
