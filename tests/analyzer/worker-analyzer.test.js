/**
 * Unit tests for core/analyzer/extended/worker-analyzer.js (Phase 10 §2.2).
 *
 * Covers:
 *  1. Non-Worker node (likelyCloudflareWorker=false) → applicable=false, all empty.
 *  2. Worker node with .workers.dev domain → workerDomain extracted.
 *  3. Worker node with UUID path segment → uuidSegment isolated.
 *  4. Worker node with ed=2048 query param → parameters map populated.
 *  5. Worker node with readable Base64 in path → decoded text in findings.
 *  6. Worker node with binary Base64 → rawBase64Detected=true, decoded=null.
 *  7. Worker node with no path → pathSegments=[], uuidSegment=null, parameters={}.
 *  8. Real-world BPB-Panel style fixture: .workers.dev + UUID + ed=2048.
 *  9. Path with multiple segments including UUID and plain segments.
 * 10. Parameter with URL-encoded value decoded correctly.
 * 11. Short values (< 8 chars) are NOT treated as Base64 candidates.
 * 12. UUID-shaped segments are NOT treated as Base64 (captured as uuidSegment only).
 * 13. .pages.dev domain extracted as workerDomain.
 * 14. worker.host / sni used when address is an IP (Clean IP + Worker combo).
 */
import { describe, it, expect } from "vitest";
import { analyzeWorker } from "../../core/analyzer/extended/worker-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

const VALID_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

/** Minimal CloudflareAnalysis stub. */
function cfAnalysis(likelyCloudflareWorker = true) {
  return /** @type {import("../../core/analyzer/types").CloudflareAnalysis} */ ({
    likelyCloudflareWorker,
    confidence: likelyCloudflareWorker ? "high" : "low",
    signals: [],
  });
}

/** Minimal node factory. */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url",
    protocol: "vless",
    address: "proxy.workers.dev",
    port: 443,
    network: "ws",
    security: "tls",
    uuid: VALID_UUID,
    ...overrides,
  }));
}

// ---------------------------------------------------------------------------
// Non-Worker → applicable=false
// ---------------------------------------------------------------------------
describe("analyzeWorker — non-Worker node", () => {
  it("returns applicable=false with all-empty fields when likelyCloudflareWorker=false", () => {
    const result = analyzeWorker(node({ address: "example.com" }), cfAnalysis(false));
    expect(result.applicable).toBe(false);
    expect(result.workerDomain).toBeNull();
    expect(result.pathSegments).toEqual([]);
    expect(result.uuidSegment).toBeNull();
    expect(result.parameters).toEqual({});
    expect(result.encodedDataFindings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Worker domain extraction
// ---------------------------------------------------------------------------
describe("analyzeWorker — workerDomain extraction", () => {
  it("extracts address when address ends with .workers.dev", () => {
    const result = analyzeWorker(node({ address: "my-proxy.workers.dev" }), cfAnalysis());
    expect(result.workerDomain).toBe("my-proxy.workers.dev");
  });

  it("extracts host when host ends with .pages.dev", () => {
    const result = analyzeWorker(node({ address: "1.1.1.1", host: "site.pages.dev" }), cfAnalysis());
    expect(result.workerDomain).toBe("site.pages.dev");
  });

  it("extracts sni when sni ends with .workers.dev", () => {
    const result = analyzeWorker(
      node({ address: "1.1.1.1", host: undefined, sni: "tunnel.workers.dev" }),
      cfAnalysis(),
    );
    expect(result.workerDomain).toBe("tunnel.workers.dev");
  });

  it("returns null workerDomain when Worker detected only by path/port (no domain suffix)", () => {
    const result = analyzeWorker(
      node({ address: "1.1.1.1", host: undefined, sni: undefined, path: `/${VALID_UUID}?ed=2048` }),
      cfAnalysis(),
    );
    expect(result.workerDomain).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Path parsing
// ---------------------------------------------------------------------------
describe("analyzeWorker — path segment + UUID extraction", () => {
  it("splits path segments correctly", () => {
    const result = analyzeWorker(node({ path: "/sub/route/endpoint" }), cfAnalysis());
    expect(result.pathSegments).toEqual(["sub", "route", "endpoint"]);
  });

  it("extracts first UUID segment as uuidSegment", () => {
    const result = analyzeWorker(node({ path: `/sub/${VALID_UUID}/ws` }), cfAnalysis());
    expect(result.uuidSegment).toBe(VALID_UUID);
  });

  it("no UUID in path → uuidSegment=null", () => {
    const result = analyzeWorker(node({ path: "/sub/route" }), cfAnalysis());
    expect(result.uuidSegment).toBeNull();
  });

  it("UUID is included in pathSegments but also captured in uuidSegment", () => {
    const result = analyzeWorker(node({ path: `/a/${VALID_UUID}/b` }), cfAnalysis());
    expect(result.pathSegments).toContain(VALID_UUID);
    expect(result.uuidSegment).toBe(VALID_UUID);
  });

  it("no path → pathSegments=[] uuidSegment=null", () => {
    const result = analyzeWorker(node({ path: undefined }), cfAnalysis());
    expect(result.pathSegments).toEqual([]);
    expect(result.uuidSegment).toBeNull();
  });

  it("root path '/' → empty pathSegments", () => {
    const result = analyzeWorker(node({ path: "/" }), cfAnalysis());
    expect(result.pathSegments).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Query parameter parsing
// ---------------------------------------------------------------------------
describe("analyzeWorker — query parameter parsing", () => {
  it("ed=2048 is parsed into parameters map", () => {
    const result = analyzeWorker(node({ path: "/sub?ed=2048" }), cfAnalysis());
    expect(result.parameters).toEqual({ ed: "2048" });
  });

  it("multiple parameters parsed correctly", () => {
    const result = analyzeWorker(node({ path: "/ws?ed=2048&type=ws&host=example.com" }), cfAnalysis());
    expect(result.parameters).toMatchObject({ ed: "2048", type: "ws", host: "example.com" });
  });

  it("no query string → empty parameters object", () => {
    const result = analyzeWorker(node({ path: "/sub" }), cfAnalysis());
    expect(result.parameters).toEqual({});
  });

  it("URL-encoded param value decoded correctly", () => {
    const result = analyzeWorker(node({ path: "/ws?host=my%20worker.example.com" }), cfAnalysis());
    expect(result.parameters.host).toBe("my worker.example.com");
  });
});

// ---------------------------------------------------------------------------
// Base64 encoded data findings
// ---------------------------------------------------------------------------
describe("analyzeWorker — Base64 encoded data", () => {
  it("readable base64 in path segment → decoded text reported", () => {
    // "hello world" in standard base64 = "aGVsbG8gd29ybGQ="
    const result = analyzeWorker(node({ path: "/sub/aGVsbG8gd29ybGQ=" }), cfAnalysis());
    const finding = result.encodedDataFindings.find((f) => f.raw === "aGVsbG8gd29ybGQ=");
    expect(finding).toBeDefined();
    expect(finding?.decoded).toBe("hello world");
    expect(finding?.rawBase64Detected).toBe(false);
  });

  it("binary base64 in path segment → rawBase64Detected=true, decoded=null", () => {
    // \x01\x02\x03\x04 in base64 = "AQIDBA=="
    const result = analyzeWorker(node({ path: "/sub/AQIDBA==" }), cfAnalysis());
    const finding = result.encodedDataFindings.find((f) => f.raw === "AQIDBA==");
    expect(finding).toBeDefined();
    expect(finding?.rawBase64Detected).toBe(true);
    expect(finding?.decoded).toBeNull();
  });

  it("readable base64 in query param value → decoded text reported", () => {
    // "config_data" in base64 = "Y29uZmlnX2RhdGE="
    const result = analyzeWorker(node({ path: "/ws?data=Y29uZmlnX2RhdGE=" }), cfAnalysis());
    const finding = result.encodedDataFindings.find((f) => f.source === "param:data");
    expect(finding).toBeDefined();
    expect(finding?.decoded).toBe("config_data");
  });

  it("UUID path segment is NOT a base64 finding (captured as uuidSegment instead)", () => {
    const result = analyzeWorker(node({ path: `/${VALID_UUID}` }), cfAnalysis());
    const uuidFinding = result.encodedDataFindings.find((f) => f.raw === VALID_UUID);
    expect(uuidFinding).toBeUndefined();
    expect(result.uuidSegment).toBe(VALID_UUID);
  });

  it("short segment (< 8 chars) is NOT treated as base64 candidate", () => {
    const result = analyzeWorker(node({ path: "/ws/v2" }), cfAnalysis());
    expect(result.encodedDataFindings).toHaveLength(0);
  });

  it("ed=2048 parameter value is NOT treated as base64 (too short)", () => {
    const result = analyzeWorker(node({ path: "/sub?ed=2048" }), cfAnalysis());
    const finding = result.encodedDataFindings.find((f) => f.source === "param:ed");
    expect(finding).toBeUndefined();
  });

  it("no encoded data in a plain Worker node → encodedDataFindings=[]", () => {
    const result = analyzeWorker(node({ path: `/sub/${VALID_UUID}?ed=2048` }), cfAnalysis());
    expect(result.encodedDataFindings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Real-world BPB-Panel fixture
// ---------------------------------------------------------------------------
describe("analyzeWorker — real-world BPB-Panel fixture", () => {
  it("extracts all fields from a typical BPB-Panel vless-cf Worker config", () => {
    const n = node({
      address: "bpb-worker.myaccount.workers.dev",
      port: 443,
      host: "bpb-worker.myaccount.workers.dev",
      sni: "bpb-worker.myaccount.workers.dev",
      path: `/sub/${VALID_UUID}?ed=2048`,
    });
    const result = analyzeWorker(n, cfAnalysis(true));

    expect(result.applicable).toBe(true);
    expect(result.workerDomain).toBe("bpb-worker.myaccount.workers.dev");
    expect(result.uuidSegment).toBe(VALID_UUID);
    expect(result.pathSegments).toContain(VALID_UUID);
    expect(result.pathSegments).toContain("sub");
    expect(result.parameters).toEqual({ ed: "2048" });
    expect(result.encodedDataFindings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Clean IP + Worker combo
// ---------------------------------------------------------------------------
describe("analyzeWorker — Clean IP + Worker combo", () => {
  it("extracts host (not address) as workerDomain when address is an IP", () => {
    const n = node({
      address: "1.1.1.1",
      host: "cdn.workers.dev",
      sni: "cdn.workers.dev",
      path: `/ws/${VALID_UUID}?ed=2560`,
    });
    const result = analyzeWorker(n, cfAnalysis(true));
    expect(result.workerDomain).toBe("cdn.workers.dev");
    expect(result.parameters).toEqual({ ed: "2560" });
  });
});
