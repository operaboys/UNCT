/**
 * Unit tests for the SIP008 Custom Parser plugin
 * (plugins/sip008-parser/index.js) — the Phase 11 Blocked-item resolution's
 * first real, non-fictional Custom Parser.
 */
import { describe, it, expect } from "vitest";
import { sip008Parser } from "../../plugins/sip008-parser/index.js";
import { normalizeAll } from "../../core/parser/factory.js";

const REAL_SIP008 = JSON.stringify({
  version: 1,
  servers: [
    {
      id: "44112c73-5fa4-4bb2-8d67-e5232cc907f2",
      remarks: "Example Server 1",
      server: "server1.example.com",
      server_port: 8888,
      password: "example-password-1",
      method: "aes-256-gcm",
    },
    {
      id: "a3481a4a-8bbb-46cc-8d67-e5232cc907f3",
      remarks: "Example Server 2",
      server: "192.0.2.1",
      server_port: 443,
      password: "example-password-2",
      method: "chacha20-ietf-poly1305",
    },
  ],
  bytes_used: 274877906944,
  bytes_remaining: 824633720832,
});

describe("sip008Parser — BaseParser contract", () => {
  it("implements every required method", () => {
    expect(typeof sip008Parser.detect).toBe("function");
    expect(typeof sip008Parser.parse).toBe("function");
    expect(typeof sip008Parser.validateStructure).toBe("function");
    expect(typeof sip008Parser.normalize).toBe("function");
    expect(typeof sip008Parser.normalizeMany).toBe("function");
    expect(typeof sip008Parser.recover).toBe("function");
    expect(sip008Parser.producesMany).toBe(true);
  });
});

describe("sip008Parser.detect", () => {
  it("scores a real SIP008 document highly", () => {
    expect(sip008Parser.detect(REAL_SIP008)).toBeGreaterThanOrEqual(90);
  });

  it("scores 0 for Xray JSON (has 'outbounds', not 'servers')", () => {
    expect(sip008Parser.detect(JSON.stringify({ outbounds: [], dns: {} }))).toBe(0);
  });

  it("scores 0 for a JSON object with 'servers' but no 'version' (not SIP008)", () => {
    expect(sip008Parser.detect(JSON.stringify({ servers: [{ server: "a", server_port: 1, password: "p", method: "m" }] }))).toBe(0);
  });

  it("scores 0 for non-JSON input", () => {
    expect(sip008Parser.detect("vless://uuid@host:443")).toBe(0);
  });

  it("scores 0 for an empty servers array", () => {
    expect(sip008Parser.detect(JSON.stringify({ version: 1, servers: [] }))).toBe(0);
  });
});

describe("sip008Parser.parse + normalizeMany — real document", () => {
  it("produces one UNMNode per server entry with the right fields", () => {
    const extraction = sip008Parser.parse(REAL_SIP008);
    const nodes = normalizeAll(sip008Parser, extraction);
    expect(nodes).toHaveLength(2);

    expect(nodes[0].protocol).toBe("shadowsocks");
    expect(nodes[0].sourceType).toBe("subscription");
    expect(nodes[0].address).toBe("server1.example.com");
    expect(nodes[0].port).toBe(8888);
    expect(nodes[0].password).toBe("example-password-1");
    expect(nodes[0].method).toBe("aes-256-gcm");
    expect(nodes[0].remark).toBe("Example Server 1");
    expect(nodes[0].metadata.parser).toBe("sip008-plugin");

    expect(nodes[1].address).toBe("192.0.2.1");
    expect(nodes[1].port).toBe(443);
    expect(nodes[1].method).toBe("chacha20-ietf-poly1305");
  });

  it("every produced node is frozen (Immutable, Rule 8)", () => {
    const extraction = sip008Parser.parse(REAL_SIP008);
    const nodes = normalizeAll(sip008Parser, extraction);
    for (const n of nodes) expect(Object.isFrozen(n)).toBe(true);
  });

  it("skips structurally invalid server entries (missing required fields)", () => {
    const withBadEntry = JSON.stringify({
      version: 1,
      servers: [
        { server: "good.example.com", server_port: 443, password: "p", method: "aes-256-gcm" },
        { server: "bad.example.com" }, // missing password/method/port
      ],
    });
    const extraction = sip008Parser.parse(withBadEntry);
    const nodes = normalizeAll(sip008Parser, extraction);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].address).toBe("good.example.com");
  });

  it("throws on malformed JSON (no usable servers)", () => {
    expect(() => sip008Parser.parse("not json at all")).toThrow(/PARSE_CONTRACT_VIOLATION/);
  });

  it("normalize() (single-node) throws per producesMany contract", () => {
    expect(() => sip008Parser.normalize({ fields: {}, raw: "" })).toThrow(/producesMany/);
  });
});

describe("sip008Parser.validateStructure", () => {
  it("overallValid is true for a document with at least one valid server", () => {
    const extraction = sip008Parser.parse(REAL_SIP008);
    expect(sip008Parser.validateStructure(extraction).overallValid).toBe(true);
  });

  it("overallValid is false for an empty server list", () => {
    expect(sip008Parser.validateStructure({ fields: { servers: [] }, raw: "" }).overallValid).toBe(false);
  });
});

describe("sip008Parser.recover", () => {
  it("recovers a JSONP-wrapped SIP008 response", () => {
    const jsonp = `callback(${REAL_SIP008});`;
    const recovered = sip008Parser.recover(jsonp);
    expect(recovered).not.toBeNull();
    const nodes = normalizeAll(sip008Parser, /** @type {any} */ (recovered));
    expect(nodes).toHaveLength(2);
  });

  it("returns null for genuinely unrecoverable input", () => {
    expect(sip008Parser.recover("complete garbage {{{")).toBeNull();
  });
});
