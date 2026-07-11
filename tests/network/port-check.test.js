/**
 * Unit tests for core/network/port-check.js (ADR-024 Port Availability Check).
 *
 * Mirrors tests/network/latency.test.js's structure since both features
 * share core/network/shared.js's probeEndpoint — see port-check.js's module
 * doc for the documented reasoning behind the overlap. These tests focus on
 * THIS module's own responsibility: mapping the shared probe's three raw
 * outcomes onto open/closed/unknown. The underlying fetch/timeout/IPv6/data-
 * minimization mechanics are already exhaustively covered by latency.test.js
 * against the same shared.js code path — duplicating them here would just
 * test shared.js twice under a different name, not this module's own logic.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { checkPort } from "../../core/network/port-check.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// checkPort — status mapping
// ---------------------------------------------------------------------------

describe("checkPort — status: open", () => {
  it("returns status 'open' with a numeric latencyMs when fetch resolves", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 200 })));

    const result = await checkPort({ address: "cdn.example.com", port: 443 });

    expect(result.status).toBe("open");
    expect(typeof (/** @type {any} */ (result)).latencyMs).toBe("number");
    expect((/** @type {any} */ (result)).latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns status 'open' even when fetch returns a non-200 HTTP response", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 400 })));

    const result = await checkPort({ address: "cdn.example.com", port: 8080 });

    expect(result.status).toBe("open");
  });
});

describe("checkPort — status: closed", () => {
  it("returns status 'closed' (no latencyMs) when fetch rejects fast with TypeError", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));

    const result = await checkPort({ address: "proxy.example.com", port: 9999 });

    expect(result).toEqual({ status: "closed" });
  });

  it("returns status 'closed' for connection-refused errors (also TypeError)", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("net::ERR_CONNECTION_REFUSED")));

    const result = await checkPort({ address: "127.0.0.1", port: 9999 });

    expect(result).toEqual({ status: "closed" });
  });
});

describe("checkPort — status: unknown", () => {
  it("returns status 'unknown' when the probe times out (filtered vs. open-non-HTTP are indistinguishable)", async () => {
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
    const p = checkPort({ address: "unreachable.example.com", port: 443 });

    await vi.advanceTimersByTimeAsync(5_100);

    const result = await p;
    expect(result).toEqual({ status: "unknown" });
  });
});

// ---------------------------------------------------------------------------
// Data Minimization — shares shared.js's boundary with measureLatency
// ---------------------------------------------------------------------------

describe("checkPort — data minimization (URL only exposes address:port)", () => {
  it("constructs a URL containing only address and port, nothing else", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.reject(new TypeError("fail"));
    });

    await checkPort({ address: "proxy.example.com", port: 8443 });

    expect(capturedUrl).toBe("http://proxy.example.com:8443/");
  });

  it("never sends credential fields even if caller passes a full node object", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.reject(new TypeError("fail"));
    });

    await checkPort(/** @type {any} */ ({
      address: "a.example.com",
      port: 443,
      uuid: "super-secret-uuid",
      password: "hunter2",
      privateKey: "wg-private",
      pbk: "reality-public-key",
    }));

    expect(capturedUrl).toBe("http://a.example.com:443/");
    expect(capturedUrl).not.toContain("super-secret-uuid");
    expect(capturedUrl).not.toContain("hunter2");
    expect(capturedUrl).not.toContain("wg-private");
    expect(capturedUrl).not.toContain("reality-public-key");
  });

  it("adds square brackets around IPv6 addresses in URL", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.reject(new TypeError("fail"));
    });

    await checkPort({ address: "2001:db8::1", port: 443 });

    expect(capturedUrl).toBe("http://[2001:db8::1]:443/");
  });
});

// ---------------------------------------------------------------------------
// Architecture Guard compatibility — sanity check
// ---------------------------------------------------------------------------

describe("architecture", () => {
  it("core/network/port-check.js is not in any protected pipeline directory", async () => {
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
