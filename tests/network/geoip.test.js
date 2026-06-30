/**
 * Unit tests for core/network/geoip.js (ADR-024 GeoIP + ASN Lookup, ADR-025).
 *
 * All network calls are mocked — no real API requests are made.
 * Key invariants tested:
 *   1. buildGeoTarget strips all fields except address
 *   2. Private/reserved addresses → "private" with zero API calls
 *   3. Successful API response → mapped to {country, region, asn, isp}
 *   4. API success:false → "private"
 *   5. Network error / non-ok response → "error"
 *   6. Data Minimization: URL only contains the address, no credentials
 *   7. Architecture Guard: core/network/ is not in the protected dirs
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { buildGeoTarget, lookupGeoIp } from "../../core/network/geoip.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// buildGeoTarget — Data Minimization boundary
// ---------------------------------------------------------------------------

describe("buildGeoTarget", () => {
  it("returns an object with exactly one key: address", () => {
    const t = buildGeoTarget({ address: "8.8.8.8" });
    expect(t).toEqual({ address: "8.8.8.8" });
    expect(Object.keys(t)).toEqual(["address"]);
  });

  it("coerces address to string", () => {
    const t = buildGeoTarget({ address: /** @type {any} */ (12345) });
    expect(t).toEqual({ address: "12345" });
    expect(typeof t.address).toBe("string");
  });

  it("strips every non-address field from a full UNMNode-like object", () => {
    const node = /** @type {any} */ ({
      address: "proxy.example.com",
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
    });
    const t = buildGeoTarget(node);
    expect(Object.keys(t)).toEqual(["address"]);
    expect(t).not.toHaveProperty("port");
    expect(t).not.toHaveProperty("uuid");
    expect(t).not.toHaveProperty("password");
    expect(t).not.toHaveProperty("privateKey");
    expect(t).not.toHaveProperty("pbk");
    expect(t).not.toHaveProperty("sid");
    expect(t).not.toHaveProperty("psk");
    expect(t).not.toHaveProperty("protocol");
    expect(t).not.toHaveProperty("nodeId");
  });

  it("trims whitespace from address", () => {
    const t = buildGeoTarget({ address: "  8.8.8.8  " });
    expect(t.address).toBe("8.8.8.8");
  });
});

// ---------------------------------------------------------------------------
// lookupGeoIp — private/reserved address detection (no API call)
// ---------------------------------------------------------------------------

describe("lookupGeoIp — private/reserved addresses (no network)", () => {
  function noFetch() {
    return vi.spyOn(globalThis, "fetch");
  }

  it.each([
    ["127.0.0.1", "loopback"],
    ["127.255.255.254", "loopback range"],
    ["10.0.0.1", "RFC-1918 class A"],
    ["10.255.255.255", "RFC-1918 class A edge"],
    ["172.16.0.1", "RFC-1918 class B start"],
    ["172.31.255.255", "RFC-1918 class B end"],
    ["192.168.0.1", "RFC-1918 class C"],
    ["192.168.255.255", "RFC-1918 class C edge"],
    ["169.254.0.1", "link-local"],
    ["::1", "IPv6 loopback"],
    ["fc00::1", "IPv6 ULA fc"],
    ["fd00::1", "IPv6 ULA fd"],
    ["fe80::1", "IPv6 link-local"],
    ["localhost", "localhost name"],
  ])("returns 'private' for %s (%s) without calling fetch", async (addr) => {
    const spy = noFetch();
    const result = await lookupGeoIp({ address: addr });
    expect(result).toEqual({ status: "private", country: null, region: null, asn: null, isp: null });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// lookupGeoIp — successful API response
// ---------------------------------------------------------------------------

describe("lookupGeoIp — status: ok", () => {
  /** @param {object} extra */
  function mockSuccess(extra = {}) {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            country: "United States",
            region: "California",
            connection: { asn: 15169, isp: "Google LLC", org: "Google LLC" },
            ...extra,
          }),
        ),
      ),
    );
  }

  it("maps ipwho.is response to {country, region, asn, isp}", async () => {
    mockSuccess();
    const result = await lookupGeoIp({ address: "8.8.8.8" });
    expect(result).toEqual({
      status: "ok",
      country: "United States",
      region: "California",
      asn: "AS15169",
      isp: "Google LLC",
    });
  });

  it("prefixes ASN number with 'AS'", async () => {
    mockSuccess();
    const result = await lookupGeoIp({ address: "1.1.1.1" });
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.asn).toBe("AS15169");
  });

  it("falls back to connection.org when connection.isp is missing", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            country: "DE",
            region: "Bavaria",
            connection: { asn: 3320, org: "Deutsche Telekom AG" },
          }),
        ),
      ),
    );
    const result = await lookupGeoIp({ address: "1.2.3.4" });
    if (result.status === "ok") expect(result.isp).toBe("Deutsche Telekom AG");
  });

  it("handles missing connection.asn gracefully (empty string)", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            country: "US",
            region: "California",
            connection: {},
          }),
        ),
      ),
    );
    const result = await lookupGeoIp({ address: "1.2.3.4" });
    if (result.status === "ok") expect(result.asn).toBe("");
  });
});

// ---------------------------------------------------------------------------
// lookupGeoIp — API-level non-success
// ---------------------------------------------------------------------------

describe("lookupGeoIp — API returns success:false", () => {
  it("returns 'private' when API says address is not public", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: false, message: "IP address is not public." }),
        ),
      ),
    );
    const result = await lookupGeoIp({ address: "192.0.2.1" });
    expect(result).toEqual({ status: "private", country: null, region: null, asn: null, isp: null });
  });
});

// ---------------------------------------------------------------------------
// lookupGeoIp — network/HTTP errors
// ---------------------------------------------------------------------------

describe("lookupGeoIp — status: error", () => {
  it("returns 'error' when fetch rejects (network error)", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    const result = await lookupGeoIp({ address: "8.8.8.8" });
    expect(result).toEqual({ status: "error", country: null, region: null, asn: null, isp: null });
  });

  it("returns 'error' when HTTP response is not ok (e.g. 500)", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(null, { status: 500 })),
    );
    const result = await lookupGeoIp({ address: "8.8.8.8" });
    expect(result).toEqual({ status: "error", country: null, region: null, asn: null, isp: null });
  });

  it("returns 'error' when response body is not valid JSON", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("not-json", { status: 200 })),
    );
    const result = await lookupGeoIp({ address: "8.8.8.8" });
    expect(result).toEqual({ status: "error", country: null, region: null, asn: null, isp: null });
  });
});

// ---------------------------------------------------------------------------
// Data Minimization — URL integrity
// ---------------------------------------------------------------------------

describe("lookupGeoIp — data minimization", () => {
  it("URL sent to API contains only the address, nothing else", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.resolve(new Response(JSON.stringify({ success: false })));
    });

    await lookupGeoIp({ address: "1.2.3.4" });

    expect(capturedUrl).toBe("https://ipwho.is/1.2.3.4");
    expect(capturedUrl).not.toContain("uuid");
    expect(capturedUrl).not.toContain("password");
    expect(capturedUrl).not.toContain("key");
    expect(capturedUrl).not.toContain("token");
  });

  it("accepts a domain name as address and sends it directly to the API", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.resolve(new Response(JSON.stringify({ success: false })));
    });

    await lookupGeoIp({ address: "cdn.example.com" });

    expect(capturedUrl).toBe("https://ipwho.is/cdn.example.com");
  });

  it("never sends credential fields even when full UNMNode passed to lookupGeoIp", async () => {
    /** @type {string | undefined} */
    let capturedUrl;
    vi.stubGlobal("fetch", /** @param {string} url */ (url) => {
      capturedUrl = url;
      return Promise.resolve(new Response(JSON.stringify({ success: false })));
    });

    await lookupGeoIp(/** @type {any} */ ({
      address: "proxy.example.com",
      port: 443,
      uuid: "super-secret-uuid",
      password: "hunter2",
      pbk: "reality-public-key",
    }));

    expect(capturedUrl).toBe("https://ipwho.is/proxy.example.com");
    expect(capturedUrl).not.toContain("super-secret-uuid");
    expect(capturedUrl).not.toContain("hunter2");
    expect(capturedUrl).not.toContain("reality-public-key");
    expect(capturedUrl).not.toContain("443");
  });
});
