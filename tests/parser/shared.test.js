import { describe, it, expect } from "vitest";
import {
  resolvePriority, levenshtein, fuzzyKey, fuzzyMatch,
  buildWireguardExtensions, WIREGUARD_EXTENSION_NS,
} from "../../core/parser/shared/index.js";

describe("shared/priority — resolvePriority (05 §2)", () => {
  it("returns the highest-priority present synonym and records all present ones", () => {
    /** @type {Record<string, string>} */
    const om = {};
    const winner = resolvePriority(
      { publicKey: "A", serverPublicKey: "B" }, ["publicKey", "serverPublicKey", "pbk"], "pbk", om,
    );
    expect(winner).toBe("A");
    expect(om).toEqual({ publicKey: "pbk", serverPublicKey: "pbk" });
  });
  it("does not record the canonical name as a synonym mapping", () => {
    /** @type {Record<string, string>} */
    const om = {};
    expect(resolvePriority({ pbk: "X" }, ["publicKey", "pbk"], "pbk", om)).toBe("X");
    expect(om).toEqual({});
  });
  it("returns undefined when no synonym is present", () => {
    /** @type {Record<string, string>} */
    const om = {};
    expect(resolvePriority({}, ["a", "b"], "a", om)).toBeUndefined();
    expect(om).toEqual({});
  });
  it("treats empty strings as absent", () => {
    /** @type {Record<string, string>} */
    const om = {};
    expect(resolvePriority({ a: "", b: "v" }, ["a", "b"], "a", om)).toBe("v");
  });
});

describe("shared/fuzzy — levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("protocl", "protocol")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("shared/fuzzy — fuzzyKey", () => {
  it("returns the exact key when present", () => {
    expect(fuzzyKey({ protocol: 1 }, "protocol")).toBe("protocol");
  });
  it("finds a near-miss key within the edit budget", () => {
    expect(fuzzyKey({ protocl: 1 }, "protocol")).toBe("protocl");
  });
  it("returns null when nothing is close enough", () => {
    expect(fuzzyKey({ zzzzzz: 1 }, "protocol")).toBeNull();
    expect(fuzzyKey({}, "protocol")).toBeNull();
  });
});

describe("shared/fuzzy — fuzzyMatch", () => {
  it("matches the closest candidate within budget", () => {
    expect(fuzzyMatch("vmes", ["vless", "vmess", "trojan"], 2)).toBe("vmess");
    expect(fuzzyMatch("vles", ["vless", "vmess"], 2)).toBe("vless");
  });
  it("returns null when no candidate is close enough", () => {
    expect(fuzzyMatch("xyzzy", ["vless", "vmess"], 2)).toBeNull();
  });
});

describe("shared/wireguard — buildWireguardExtensions (ADR-007)", () => {
  it("uses the fixed namespace key", () => {
    expect(WIREGUARD_EXTENSION_NS).toBe("wireguard");
  });
  it("includes only present keys and coerces list/int types", () => {
    const ext = buildWireguardExtensions({
      privateKey: "pk", publicKey: "pub", allowedIPs: "0.0.0.0/0, ::/0",
      dns: ["1.1.1.1"], mtu: "1420", persistentKeepalive: 25, endpoint: "h:51820",
    });
    expect(ext).toEqual({
      wireguard: {
        privateKey: "pk", publicKey: "pub", endpoint: "h:51820",
        allowedIPs: ["0.0.0.0/0", "::/0"], dns: ["1.1.1.1"],
        mtu: 1420, persistentKeepalive: 25,
      },
    });
  });
  it("returns null when no WireGuard key is present", () => {
    expect(buildWireguardExtensions({ foo: "bar" })).toBeNull();
  });
  it("drops non-integer mtu/keepalive rather than storing garbage", () => {
    const ext = buildWireguardExtensions({ privateKey: "pk", mtu: "not-a-number" });
    expect(ext).toEqual({ wireguard: { privateKey: "pk" } });
  });
});
