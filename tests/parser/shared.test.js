import { describe, it, expect } from "vitest";
import {
  resolvePriority, levenshtein, fuzzyKey, fuzzyMatch,
  buildWireguardExtensions, WIREGUARD_EXTENSION_NS,
  trimOrReject, isUrlScheme, looksLikeJson, validateItemsStructure,
  parseAlpnArray, repairAndParseJson,
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

describe("shared/detect-guards — trimOrReject/isUrlScheme/looksLikeJson", () => {
  it("trimOrReject rejects non-strings and empty/whitespace-only input", () => {
    expect(trimOrReject(/** @type {any} */ (undefined))).toBeNull();
    expect(trimOrReject(/** @type {any} */ (123))).toBeNull();
    expect(trimOrReject("")).toBeNull();
    expect(trimOrReject("   ")).toBeNull();
  });
  it("trimOrReject returns the trimmed string otherwise", () => {
    expect(trimOrReject("  hi  ")).toBe("hi");
  });
  it("isUrlScheme detects a scheme:// prefix only", () => {
    expect(isUrlScheme("vless://abc")).toBe(true);
    expect(isUrlScheme("{\"a\":1}")).toBe(false);
  });
  it("looksLikeJson checks the opening character only", () => {
    expect(looksLikeJson("{\"a\":1}")).toBe(true);
    expect(looksLikeJson("[1,2]")).toBe(true);
    expect(looksLikeJson("proxies:\n  - a")).toBe(false);
  });
});

describe("shared/validate-structure — validateItemsStructure", () => {
  it("is overallValid when a non-empty array is present under the default key", () => {
    const v = validateItemsStructure({ fields: { items: [{}] } });
    expect(v.overallValid).toBe(true);
    expect(v.addressValid).toBe(true);
    expect(v.portValid).toBe(true);
    expect(v.uuidValid).toBeNull();
  });
  it("is invalid when the array is empty or missing", () => {
    expect(validateItemsStructure({ fields: { items: [] } }).overallValid).toBe(false);
    expect(validateItemsStructure({ fields: {} }).overallValid).toBe(false);
  });
  it("reads a custom key (Subscription uses 'lines')", () => {
    expect(validateItemsStructure({ fields: { lines: ["x"] } }, "lines").overallValid).toBe(true);
    expect(validateItemsStructure({ fields: { lines: [] } }, "lines").overallValid).toBe(false);
  });
});

describe("shared/alpn — parseAlpnArray", () => {
  it("keeps only string entries of an array", () => {
    expect(parseAlpnArray(["h2", "http/1.1", 5, null])).toEqual(["h2", "http/1.1"]);
  });
  it("returns undefined for an empty/non-array input", () => {
    expect(parseAlpnArray([])).toBeUndefined();
    expect(parseAlpnArray("h2,http/1.1")).toBeUndefined();
    expect(parseAlpnArray(undefined)).toBeUndefined();
  });
});

describe("shared/json — repairAndParseJson", () => {
  it("repairs and parses in one step", () => {
    const result = repairAndParseJson('{"a":1,}');
    expect(result?.config).toEqual({ a: 1 });
    expect(result?.actions).toEqual(["REC_STRUCTURE_REPAIRED: removed trailing commas"]);
  });
  it("returns null for empty/non-string input", () => {
    expect(repairAndParseJson("")).toBeNull();
    expect(repairAndParseJson(/** @type {any} */ (undefined))).toBeNull();
  });
  it("returns null when the input cannot be repaired into valid JSON", () => {
    expect(repairAndParseJson("not json at all")).toBeNull();
  });
});
