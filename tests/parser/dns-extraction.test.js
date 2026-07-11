/**
 * DNS extraction tests — ADR-022.
 * Verifies that extractXrayDns, extractSingBoxDns, and extractClashDns
 * correctly parse and return ConfigDns objects (or undefined when absent).
 */

import { describe, it, expect } from "vitest";
import { extractXrayDns } from "../../core/parser/xray/extract.js";
import { extractSingBoxDns } from "../../core/parser/singbox/extract.js";
import { extractClashDns } from "../../core/parser/clash/extract.js";

// ─────────────────────────── Xray ───────────────────────────

describe("extractXrayDns", () => {
  it("returns undefined when dns block is absent", () => {
    expect(extractXrayDns({})).toBeUndefined();
    expect(extractXrayDns({ dns: null })).toBeUndefined();
    expect(extractXrayDns(null)).toBeUndefined();
  });

  it("returns undefined when servers list is empty", () => {
    expect(extractXrayDns({ dns: { servers: [] } })).toBeUndefined();
  });

  it("extracts string servers", () => {
    const result = extractXrayDns({ dns: { servers: ["8.8.8.8", "1.1.1.1"] } });
    expect(result).toEqual({ servers: ["8.8.8.8", "1.1.1.1"], fakeIp: false });
  });

  it("extracts object-form servers (address field)", () => {
    const result = extractXrayDns({
      dns: {
        servers: [
          { address: "8.8.8.8", port: 53 },
          "1.1.1.1",
          { address: "9.9.9.9" },
        ],
      },
    });
    expect(result?.servers).toEqual(["8.8.8.8", "1.1.1.1", "9.9.9.9"]);
  });

  it("skips servers without a string address", () => {
    const result = extractXrayDns({ dns: { servers: [42, null, "8.8.8.8"] } });
    expect(result?.servers).toEqual(["8.8.8.8"]);
  });

  it("captures queryStrategy as strategy", () => {
    const result = extractXrayDns({ dns: { servers: ["1.1.1.1"], queryStrategy: "UseIPv4" } });
    expect(result?.strategy).toBe("UseIPv4");
  });

  it("omits strategy when absent", () => {
    const result = extractXrayDns({ dns: { servers: ["1.1.1.1"] } });
    expect(result).not.toHaveProperty("strategy");
  });

  it("fakeIp is false when dns.fakeIp block is absent", () => {
    const result = extractXrayDns({ dns: { servers: ["1.1.1.1"] } });
    expect(result?.fakeIp).toBe(false);
  });

  it("fakeIp is true when dns.fakeIp.enabled is true", () => {
    const result = extractXrayDns({ dns: { servers: ["1.1.1.1"], fakeIp: { enabled: true } } });
    expect(result?.fakeIp).toBe(true);
  });
});

// ─────────────────────────── Sing-box ───────────────────────────

describe("extractSingBoxDns", () => {
  it("returns undefined when dns block is absent", () => {
    expect(extractSingBoxDns({})).toBeUndefined();
    expect(extractSingBoxDns(null)).toBeUndefined();
  });

  it("returns undefined when servers empty and fakeIp disabled", () => {
    expect(extractSingBoxDns({ dns: { servers: [] } })).toBeUndefined();
  });

  it("extracts string servers from dns.servers", () => {
    const result = extractSingBoxDns({ dns: { servers: ["8.8.8.8", "https://1.1.1.1/dns-query"] } });
    expect(result?.servers).toEqual(["8.8.8.8", "https://1.1.1.1/dns-query"]);
    expect(result?.fakeIp).toBe(false);
  });

  it("extracts object-form servers (s.address)", () => {
    const result = extractSingBoxDns({
      dns: { servers: [{ address: "8.8.8.8", tag: "google" }, "1.1.1.1"] },
    });
    expect(result?.servers).toEqual(["8.8.8.8", "1.1.1.1"]);
  });

  it("sets fakeIp true when dns.fakeip.enabled is true", () => {
    const result = extractSingBoxDns({
      dns: { servers: [], fakeip: { enabled: true, inet4_range: "198.18.0.0/15" } },
    });
    expect(result?.fakeIp).toBe(true);
  });

  it("returns result even with empty servers when fakeIp is true", () => {
    const result = extractSingBoxDns({
      dns: { servers: [], fakeip: { enabled: true } },
    });
    expect(result).toBeDefined();
    expect(result?.servers).toEqual([]);
    expect(result?.fakeIp).toBe(true);
  });

  it("does not include strategy field", () => {
    const result = extractSingBoxDns({ dns: { servers: ["8.8.8.8"] } });
    expect(result).not.toHaveProperty("strategy");
  });
});

// ─────────────────────────── Clash ───────────────────────────

describe("extractClashDns", () => {
  it("returns undefined when dns block is absent", () => {
    expect(extractClashDns({})).toBeUndefined();
    expect(extractClashDns(null)).toBeUndefined();
  });

  it("returns undefined when dns.enable is false", () => {
    expect(extractClashDns({ dns: { enable: false, nameserver: ["8.8.8.8"] } })).toBeUndefined();
  });

  it("returns undefined when no servers and not fake-ip", () => {
    expect(extractClashDns({ dns: {} })).toBeUndefined();
  });

  it("extracts nameserver entries", () => {
    const result = extractClashDns({ dns: { nameserver: ["8.8.8.8", "1.1.1.1"] } });
    expect(result?.servers).toContain("8.8.8.8");
    expect(result?.servers).toContain("1.1.1.1");
    expect(result?.fakeIp).toBe(false);
  });

  it("combines nameserver + fallback + default-nameserver into servers", () => {
    const result = extractClashDns({
      dns: {
        nameserver: ["8.8.8.8"],
        fallback: ["1.1.1.1"],
        "default-nameserver": ["9.9.9.9"],
      },
    });
    expect(result?.servers).toContain("8.8.8.8");
    expect(result?.servers).toContain("1.1.1.1");
    expect(result?.servers).toContain("9.9.9.9");
  });

  it("fakeIp is true when enhanced-mode is fake-ip", () => {
    const result = extractClashDns({ dns: { "enhanced-mode": "fake-ip" } });
    expect(result?.fakeIp).toBe(true);
    expect(result?.strategy).toBe("fake-ip");
  });

  it("sets strategy to enhanced-mode value", () => {
    const result = extractClashDns({ dns: { nameserver: ["1.1.1.1"], "enhanced-mode": "redir-host" } });
    expect(result?.strategy).toBe("redir-host");
  });

  it("returns result with empty servers when fakeIp is true", () => {
    const result = extractClashDns({ dns: { "enhanced-mode": "fake-ip" } });
    expect(result).toBeDefined();
    expect(result?.servers).toEqual([]);
  });

  it("filters out non-string entries from server pools", () => {
    const result = extractClashDns({ dns: { nameserver: [42, "8.8.8.8", null] } });
    expect(result?.servers).toEqual(["8.8.8.8"]);
  });
});
