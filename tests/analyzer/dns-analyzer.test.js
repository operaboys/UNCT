/**
 * DNS Leak Risk Analyzer tests — ADR-022.
 * Covers all 9 matrix rows from the ADR + edge cases.
 */

import { describe, it, expect } from "vitest";
import { analyzeDnsLeakRisk } from "../../core/analyzer/extended/dns-analyzer.js";

/** Build a minimal UNMNode stub for testing. */
function node(overrides = {}) {
  return /** @type {any} */ ({
    nodeId: "test-node",
    sourceType: "xray-json",
    protocol: "vless",
    address: "1.2.3.4",
    port: 443,
    network: "tcp",
    security: "tls",
    metadata: { parser: "XrayParser", confidence: 95, warnings: [], recoveryActions: [], originalMappings: {} },
    ...overrides,
  });
}

// ─── Row 1: No extensions at all → unknown ───
describe("no DNS data", () => {
  it("returns 'unknown' when extensions is absent", () => {
    expect(analyzeDnsLeakRisk(node())).toBe("unknown");
  });

  it("returns 'unknown' when extensions is null-ish", () => {
    expect(analyzeDnsLeakRisk(node({ extensions: null }))).toBe("unknown");
  });

  it("returns 'unknown' when extensions has no configDns", () => {
    expect(analyzeDnsLeakRisk(node({ extensions: {} }))).toBe("unknown");
  });

  it("returns 'unknown' for URL-scheme sourceType nodes (never carry configDns)", () => {
    expect(analyzeDnsLeakRisk(node({ sourceType: "vless-url", extensions: undefined }))).toBe("unknown");
  });

  it("returns 'unknown' for subscription sourceType nodes", () => {
    expect(analyzeDnsLeakRisk(node({ sourceType: "subscription", extensions: undefined }))).toBe("unknown");
  });
});

// ─── Row 2: fakeIp = true → none ───
describe("fakeIp=true", () => {
  it("returns 'none' when fakeIp is true (xray)", () => {
    const n = node({ extensions: { configDns: { servers: ["fake-ip"], fakeIp: true } } });
    expect(analyzeDnsLeakRisk(n)).toBe("none");
  });

  it("returns 'none' even when servers list is empty but fakeIp=true", () => {
    const n = node({ extensions: { configDns: { servers: [], fakeIp: true } } });
    expect(analyzeDnsLeakRisk(n)).toBe("none");
  });
});

// ─── Row 3: all private → low ───
describe("all private/encrypted → low", () => {
  it("private IPv4 only (10.x.x.x)", () => {
    const n = node({ extensions: { configDns: { servers: ["10.0.0.1"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });

  it("192.168.x.x is private", () => {
    const n = node({ extensions: { configDns: { servers: ["192.168.1.1"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });

  it("172.16.x.x is private", () => {
    const n = node({ extensions: { configDns: { servers: ["172.16.0.1"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });

  it("localhost is private", () => {
    const n = node({ extensions: { configDns: { servers: ["127.0.0.1"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });

  it("DoH URL is private/encrypted", () => {
    const n = node({ extensions: { configDns: { servers: ["https://1.1.1.1/dns-query"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });

  it("DoT URL is private/encrypted", () => {
    const n = node({ extensions: { configDns: { servers: ["tls://8.8.8.8"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });

  it("QUIC URL is private/encrypted", () => {
    const n = node({ extensions: { configDns: { servers: ["quic://dns.nextdns.io"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });
});

// ─── Row 4: mixed private + public → medium ───
describe("mixed → medium", () => {
  it("one private + one public returns medium", () => {
    const n = node({
      extensions: { configDns: { servers: ["10.0.0.1", "8.8.8.8"], fakeIp: false } },
    });
    expect(analyzeDnsLeakRisk(n)).toBe("medium");
  });

  it("DoH + public cleartext = medium", () => {
    const n = node({
      extensions: { configDns: { servers: ["https://1.1.1.1/dns-query", "1.1.1.1"], fakeIp: false } },
    });
    expect(analyzeDnsLeakRisk(n)).toBe("medium");
  });
});

// ─── Row 5: all public cleartext → high ───
describe("all public cleartext → high", () => {
  it("Google DNS is public cleartext", () => {
    const n = node({ extensions: { configDns: { servers: ["8.8.8.8", "8.8.4.4"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("high");
  });

  it("Cloudflare 1.1.1.1 is public cleartext", () => {
    const n = node({ extensions: { configDns: { servers: ["1.1.1.1"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("high");
  });

  it("Quad9 is public cleartext", () => {
    const n = node({ extensions: { configDns: { servers: ["9.9.9.9"], fakeIp: false } } });
    expect(analyzeDnsLeakRisk(n)).toBe("high");
  });
});

// ─── Row 6: WireGuard .conf DNS ───
describe("wireguard-config sourceType", () => {
  it("returns unknown when no wireguard extensions", () => {
    const n = node({ sourceType: "wireguard-config", extensions: {} });
    expect(analyzeDnsLeakRisk(n)).toBe("unknown");
  });

  it("returns unknown when wireguard.dns is absent", () => {
    const n = node({ sourceType: "wireguard-config", extensions: { wireguard: {} } });
    expect(analyzeDnsLeakRisk(n)).toBe("unknown");
  });

  it("reads wireguard.dns string and classifies risk", () => {
    const n = node({
      sourceType: "wireguard-config",
      extensions: { wireguard: { dns: "10.0.0.1" } },
    });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });

  it("reads wireguard.dns array and classifies risk", () => {
    const n = node({
      sourceType: "wireguard-config",
      extensions: { wireguard: { dns: ["8.8.8.8", "1.1.1.1"] } },
    });
    expect(analyzeDnsLeakRisk(n)).toBe("high");
  });

  it("mixed wireguard.dns array → medium", () => {
    const n = node({
      sourceType: "wireguard-config",
      extensions: { wireguard: { dns: ["10.0.0.1", "8.8.8.8"] } },
    });
    expect(analyzeDnsLeakRisk(n)).toBe("medium");
  });

  it("ignores extensions.configDns for wireguard-config sourceType", () => {
    const n = node({
      sourceType: "wireguard-config",
      extensions: {
        wireguard: { dns: "8.8.8.8" },
        configDns: { servers: [], fakeIp: true },
      },
    });
    // fakeIp from configDns must NOT apply; WireGuard path is used
    expect(analyzeDnsLeakRisk(n)).toBe("high");
  });
});

// ─── WireGuard in Sing-box/Clash (sourceType NOT wireguard-config) ───
describe("wireguard via singbox-json / clash-yaml sourceType", () => {
  it("uses extensions.configDns for singbox wireguard nodes", () => {
    const n = node({
      sourceType: "singbox-json",
      protocol: "wireguard",
      extensions: {
        wireguard: { privateKey: "xxx" },
        configDns: { servers: ["10.0.0.1"], fakeIp: false },
      },
    });
    expect(analyzeDnsLeakRisk(n)).toBe("low");
  });
});

// ─── Clash fake-ip strategy ───
describe("Clash fake-ip via strategy field", () => {
  it("fakeIp=true from Clash enhanced-mode=fake-ip → none", () => {
    const n = node({
      sourceType: "clash-yaml",
      extensions: { configDns: { servers: [], fakeIp: true, strategy: "fake-ip" } },
    });
    expect(analyzeDnsLeakRisk(n)).toBe("none");
  });
});
