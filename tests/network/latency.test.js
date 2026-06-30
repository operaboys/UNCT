/**
 * Unit tests for core/network/latency.js (ADR-024 Latency Tester).
 *
 * All network calls are mocked — no real outbound connections are made.
 * Key invariants tested:
 *   1. Status mapping: ok / unreachable / timeout
 *   2. Data Minimization: buildPingTarget strips non-address/port fields
 *   3. URL integrity: only address:port reaches fetch(), no credential leakage
 *   4. IPv6 bracket handling in URL construction
 *   5. Architecture Guard compatibility: this file lives in tests/network/,
 *      core/network/ is NOT in the protected pipeline dirs — the guard passes.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { buildPingTarget, measureLatency } from "../../core/network/latency.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// buildPingTarget — Data Minimization boundary
// ---------------------------------------------------------------------------

describe("buildPingTarget", () => {
  it("returns an object with exactly address and port", () => {
    const t = buildPingTarget({ address: "proxy.example.com", port: 443 });
    expect(t).toEqual({ address: "proxy.example.com", port: 443 });
    expect(Object.keys(t).sort()).toEqual(["address", "port"]);
  });

  it("coerces numeric address to string and string port to number", () => {
    const t = buildPingTarget({ address: /** @type {any} */ (12345), port: /** @type {any} */ ("8080") });
    expect(t).toEqual({ address: "12345", port: 8080 });
    expect(typeof t.address).toBe("string");
    expect(typeof t.port).toBe("number");
  });

  it("strips every other field even when a full UNMNode-like object is passed", () => {
    const node = /** @type {any} */ ({
      address: "a.example.com",
      port: 443,
      uuid: "secret-uuid",
      password: "hunter2",
      privateKey: "wg-private",
      publicKey: "wg-public",
      pbk: "reality-public",
      sid: "reality-sid",
      psk: "reality-psk",
      protocol: "vless",
      nodeId: "some-id",
      security: "tls",
      network: "ws",
    });
    const t = buildPingTarget(node);
    expect(Object.keys(t).sort()).toEqual(["address", "port"]);
    expect(t).not.toHaveProperty("uuid");
    expect(t).not.toHaveProperty("password");
    expect(t).not.toHaveProperty("privateKey");
    expect(t).not.toHaveProperty("publicKey");
    expect(t).not.toHaveProperty("pbk");
    expect(t).not.toHaveProperty("sid");
    expect(t).not.toHaveProperty("psk");
    expect(t).not.toHaveProperty("protocol");
    expect(t).not.toHaveProperty("nodeId");
  });
});

// ---------------------------------------------------------------------------
// measureLatency — status mapping
// ---------------------------------------------------------------------------

describe("measureLatency — status: ok", () => {
  it("returns status 'ok' with a numeric rtt when fetch resolves", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 200 })));

    const result = await measureLatency({ address: "cdn.example.com", port: 443 });

    expect(result.status).toBe("ok");
    expect(typeof result.rtt).toBe("number");
    expect(result.rtt).toBeGreaterThanOrEqual(0);
  });

  it("returns status 'ok' even when fetch returns a non-200 HTTP response", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 400 })));

    const result = await measureLatency({ address: "cdn.example.com", port: 8080 });

    expect(result.status).toBe("ok");
    expect(typeof result.rtt).toBe("number");
  });
});

describe("measureLatency — status: unreachable", () => {
  it("returns status 'unreachable' with null rtt when fetch rejects with TypeError", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));

    const result = await measureLatency({ address: "proxy.example.com", port: 443 });

    expect(result).toEqual({ status: "unreachable", rtt: null });
  });

  it("returns 'unreachable' for connection-refused errors (also TypeError)", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("net::ERR_CONNECTION_REFUSED")));

    const result = await measureLatency({ address: "127.0.0.1", port: 9999 });

    expect(result).toEqual({ status: "unreachable", rtt: null });
  });
});

describe("measureLatency — status: timeout", () => {
  it("returns status 'timeout' with null rtt when AbortController fires", async () => {
    vi.stubGlobal(
      "fetch",
      /** @param {string} _url @param {{ signal: AbortSignal }} opts */
      (_url, opts) =>
        new Promise((_, reject) => {
          opts.signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );

    vi.useFakeTimers();
    const p = measureLatency({ address: "unreachable.example.com", port: 443 });

    await vi.advanceTimersByTimeAsync(5_100);

    const result = await p;
    expect(result).toEqual({ status: "timeout", rtt: null });
  });
});

// ---------------------------------------------------------------------------
// Data Minimization — URL integrity
// ---------------------------------------------------------------------------

describe("measureLatency — data minimization (URL only exposes address:port)", () => {
  it("constructs a URL containing only address and port, nothing else", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.reject(new TypeError("fail"));
    });

    await measureLatency({ address: "proxy.example.com", port: 8443 });

    expect(capturedUrl).toBe("http://proxy.example.com:8443/");
    expect(capturedUrl).not.toContain("uuid");
    expect(capturedUrl).not.toContain("password");
    expect(capturedUrl).not.toContain("key");
    expect(capturedUrl).not.toContain("token");
  });

  it("uses no-cors mode so CORS headers never need to match", async () => {
    /** @type {RequestInit | undefined} */
    let capturedOpts;
    vi.stubGlobal("fetch", /** @param {string} _url @param {RequestInit} opts */ (_url, opts) => {
      capturedOpts = opts;
      return Promise.reject(new TypeError("fail"));
    });

    await measureLatency({ address: "proxy.example.com", port: 443 });

    expect(capturedOpts?.mode).toBe("no-cors");
    expect(capturedOpts?.method).toBe("HEAD");
    expect(capturedOpts?.cache).toBe("no-store");
  });

  it("adds square brackets around IPv6 addresses in URL", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.reject(new TypeError("fail"));
    });

    await measureLatency({ address: "2001:db8::1", port: 443 });

    expect(capturedUrl).toBe("http://[2001:db8::1]:443/");
  });

  it("never sends credential fields even if caller passes a full node object", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.reject(new TypeError("fail"));
    });

    await measureLatency(/** @type {any} */ ({
      address: "a.example.com",
      port: 443,
      uuid: "super-secret-uuid",
      password: "hunter2",
      pbk: "reality-public-key",
    }));

    expect(capturedUrl).toBe("http://a.example.com:443/");
    expect(capturedUrl).not.toContain("super-secret-uuid");
    expect(capturedUrl).not.toContain("hunter2");
    expect(capturedUrl).not.toContain("reality-public-key");
  });
});

// ---------------------------------------------------------------------------
// Architecture Guard compatibility — sanity check
// ---------------------------------------------------------------------------

describe("architecture", () => {
  it("core/network/latency.js is not in any protected pipeline directory", async () => {
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const thisDir = dirname(fileURLToPath(import.meta.url));
    const root = join(thisDir, "../..");

    const guardTest = readFileSync(
      join(root, "tests/architecture/no-network-in-core-pipeline.test.js"),
      "utf-8",
    );

    expect(guardTest).toContain('"core/parser"');
    expect(guardTest).toContain('"core/analyzer"');
    expect(guardTest).toContain('"core/converter"');
    expect(guardTest).toContain('"core/validator"');
    expect(guardTest).toContain('"core/unm"');
    // core/network is the network module itself — NOT protected
    expect(guardTest).not.toContain('"core/network"');
  });
});
