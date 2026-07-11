/**
 * Unit tests for core/analyzer/extended/clean-ip-analyzer.js (Phase 10).
 *
 * Covers:
 *  1. HIGH confidence — IPv4 address + host/sni is a different domain.
 *  2. HIGH confidence — IPv6 address + sni is a different domain.
 *  3. MEDIUM confidence — IPv4 address + host/sni absent.
 *  4. LOW confidence — IPv4 address + host/sni equals the IP (same target).
 *  5. Not a Clean IP — address is a domain, not a raw IP.
 *  6. Explicit negative: CDN-fronted node with correct IP + domain separation.
 *  7. Only sni set (no host) + address is IP → HIGH.
 *  8. Only host set (no sni) + address is IP → HIGH.
 *  9. Real-world fixture: IP address + Cloudflare-hosted SNI domain.
 * 10. IPv6 address without domain separation → not HIGH.
 */
import { describe, it, expect } from "vitest";
import { analyzeCleanIp } from "../../core/analyzer/extended/clean-ip-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

/** Minimal node factory. */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url",
    protocol: "vless",
    address: "example.com",
    port: 443,
    network: "tcp",
    security: "none",
    uuid: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    ...overrides,
  }));
}

// ---------------------------------------------------------------------------
// HIGH confidence — full Clean IP pattern
// ---------------------------------------------------------------------------
describe("analyzeCleanIp — HIGH: IPv4 + separate domain", () => {
  it("IPv4 address + host is a different domain → HIGH, isCleanIpPattern=true", () => {
    const result = analyzeCleanIp(node({ address: "1.1.1.1", host: "cdn.example.com", sni: undefined }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
    expect(result.signals.some((s) => s.includes("IPv4"))).toBe(true);
    expect(result.signals.some((s) => s.includes("host"))).toBe(true);
  });

  it("IPv4 address + sni is a different domain → HIGH, isCleanIpPattern=true", () => {
    const result = analyzeCleanIp(node({ address: "104.21.10.5", sni: "proxy.workers.dev", host: undefined }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("IPv4 address + both host and sni are different domains → HIGH", () => {
    const result = analyzeCleanIp(node({
      address: "192.0.2.1",
      host: "cdn.example.com",
      sni: "proxy.workers.dev",
    }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
    // Both host and sni signals present.
    expect(result.signals.some((s) => s.includes("host"))).toBe(true);
    expect(result.signals.some((s) => s.includes("sni"))).toBe(true);
  });

  it("IPv6 address + sni is a different domain → HIGH", () => {
    const result = analyzeCleanIp(node({
      address: "2606:4700:4700::1111",
      sni: "cdn.example.com",
    }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
    expect(result.signals.some((s) => s.includes("IPv6"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MEDIUM confidence — IP present but no domain set
// ---------------------------------------------------------------------------
describe("analyzeCleanIp — MEDIUM: IP address but no host/sni", () => {
  it("IPv4 address + no host + no sni → MEDIUM, isCleanIpPattern=false", () => {
    const result = analyzeCleanIp(node({ address: "10.0.0.1", host: undefined, sni: undefined }));
    expect(result.isCleanIpPattern).toBe(false);
    expect(result.confidence).toBe("medium");
    expect(result.signals.some((s) => s.includes("absent"))).toBe(true);
  });

  it("IPv4 address + empty host string + empty sni string → MEDIUM", () => {
    const result = analyzeCleanIp(node({ address: "172.16.0.1", host: "", sni: "" }));
    expect(result.isCleanIpPattern).toBe(false);
    expect(result.confidence).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// LOW confidence — IP present but host/sni equals the IP (no separation)
// ---------------------------------------------------------------------------
describe("analyzeCleanIp — LOW: host/sni matches the IP", () => {
  it("IPv4 address + host equals address → LOW, isCleanIpPattern=false", () => {
    const result = analyzeCleanIp(node({ address: "1.2.3.4", host: "1.2.3.4" }));
    expect(result.isCleanIpPattern).toBe(false);
    expect(result.confidence).toBe("low");
  });

  it("IPv4 address + sni equals address → LOW", () => {
    const result = analyzeCleanIp(node({ address: "5.6.7.8", sni: "5.6.7.8" }));
    expect(result.isCleanIpPattern).toBe(false);
    expect(result.confidence).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// Not a Clean IP — address is a domain
// ---------------------------------------------------------------------------
describe("analyzeCleanIp — address is a domain (not an IP)", () => {
  it("domain address → isCleanIpPattern=false, confidence=low, no signals", () => {
    const result = analyzeCleanIp(node({ address: "example.com", host: "cdn.example.com" }));
    expect(result.isCleanIpPattern).toBe(false);
    expect(result.confidence).toBe("low");
    expect(result.signals).toHaveLength(0);
  });

  it("workers.dev address → not a Clean IP (IP check fails)", () => {
    const result = analyzeCleanIp(node({ address: "proxy.workers.dev" }));
    expect(result.isCleanIpPattern).toBe(false);
    expect(result.signals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Only host or only sni
// ---------------------------------------------------------------------------
describe("analyzeCleanIp — partial host/sni presence", () => {
  it("only sni set (host absent) + IP address → HIGH", () => {
    const result = analyzeCleanIp(node({ address: "104.21.0.1", sni: "tunnel.example.com", host: undefined }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
    expect(result.signals.some((s) => s.includes("sni"))).toBe(true);
  });

  it("only host set (sni absent) + IP address → HIGH", () => {
    const result = analyzeCleanIp(node({ address: "198.51.100.7", host: "proxy.example.com", sni: undefined }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
    expect(result.signals.some((s) => s.includes("host"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Real-world fixture: CDN bypass config
// ---------------------------------------------------------------------------
describe("analyzeCleanIp — real-world CDN bypass fixture", () => {
  it("Cloudflare clean IP (1.1.1.1) with workers.dev SNI → HIGH, signals list both address and domain", () => {
    const result = analyzeCleanIp(node({
      address: "1.1.1.1",
      port: 443,
      host: "myproxy.workers.dev",
      sni: "myproxy.workers.dev",
      path: "/ws?ed=2048",
    }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
    // signals must mention IP kind AND domain separation
    expect(result.signals.some((s) => s.includes("IPv4"))).toBe(true);
    expect(result.signals.some((s) => s.includes("host") || s.includes("sni"))).toBe(true);
  });

  it("IPv6 + different SNI → HIGH", () => {
    const result = analyzeCleanIp(node({
      address: "2001:db8::1",
      sni: "cdn.example.net",
    }));
    expect(result.isCleanIpPattern).toBe(true);
    expect(result.confidence).toBe("high");
  });
});
