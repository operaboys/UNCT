/**
 * Unit tests for core/analyzer/extended/cloudflare-analyzer.js (Phase 10).
 *
 * Covers:
 *  1. HIGH confidence — .workers.dev / .pages.dev domain in address/host/sni.
 *  2. MEDIUM confidence — path with ed=2048 or ed=2560 (no CF port).
 *  3. MEDIUM confidence — path with UUID segment (no CF port).
 *  4. Weight 2+port → HIGH confidence (path signal + CF port → boost).
 *  5. LOW confidence — CF port only, no other signal.
 *  6. No signals → likelyCloudflareWorker=false, confidence="low".
 *  7. Negative cases: non-CF domain, non-CF port, irrelevant path.
 *  8. Signal deduplication: multiple CF fields only count once (weight=max).
 *  9. Real-world fixture: .workers.dev address + ed=2048 path.
 * 10. Case-insensitivity of domain suffix check.
 */
import { describe, it, expect } from "vitest";
import { analyzeCloudflare } from "../../core/analyzer/extended/cloudflare-analyzer.js";
import { createNode } from "../../core/unm/create-node.js";

/** Minimal node factory — only overrides matter for cloudflare analysis. */
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
// Signal ①: .workers.dev / .pages.dev domain
// ---------------------------------------------------------------------------
describe("analyzeCloudflare — Signal ①: Worker/Pages domain suffix", () => {
  it("address=*.workers.dev → HIGH, likelyCloudflareWorker=true", () => {
    const result = analyzeCloudflare(node({ address: "my-worker.workers.dev" }));
    expect(result.likelyCloudflareWorker).toBe(true);
    expect(result.confidence).toBe("high");
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it("host=*.pages.dev → HIGH, likelyCloudflareWorker=true", () => {
    const result = analyzeCloudflare(node({ host: "project.pages.dev" }));
    expect(result.likelyCloudflareWorker).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("sni=*.workers.dev → HIGH", () => {
    const result = analyzeCloudflare(node({ sni: "tunnel.workers.dev" }));
    expect(result.likelyCloudflareWorker).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("case-insensitive suffix check — WORKERS.DEV → HIGH", () => {
    const result = analyzeCloudflare(node({ address: "proxy.WORKERS.DEV" }));
    expect(result.confidence).toBe("high");
  });

  it("address=*.pages.dev → HIGH, likelyCloudflareWorker=true", () => {
    const result = analyzeCloudflare(node({ address: "site.pages.dev" }));
    expect(result.likelyCloudflareWorker).toBe(true);
    expect(result.confidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// Signal ②: early-data path parameter
// ---------------------------------------------------------------------------
describe("analyzeCloudflare — Signal ②: early-data path parameter", () => {
  it("path with ed=2048 and no CF port → MEDIUM, likelyCloudflareWorker=true", () => {
    const result = analyzeCloudflare(node({ path: "/sub?ed=2048", port: 1234 }));
    expect(result.likelyCloudflareWorker).toBe(true);
    expect(result.confidence).toBe("medium");
  });

  it("path with ed=2560 → MEDIUM", () => {
    const result = analyzeCloudflare(node({ path: "/?ed=2560", port: 1234 }));
    expect(result.confidence).toBe("medium");
  });

  it("path with ed=2048 + CF port → HIGH (weight boost)", () => {
    const result = analyzeCloudflare(node({ path: "/sub?ed=2048", port: 443 }));
    expect(result.confidence).toBe("high");
    expect(result.likelyCloudflareWorker).toBe(true);
  });

  it("path with ed=9999 (unknown value) → not matched", () => {
    const result = analyzeCloudflare(node({ path: "/sub?ed=9999", port: 1234 }));
    // Only CF port not present, no other signal
    expect(result.confidence).toBe("low");
    expect(result.likelyCloudflareWorker).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Signal ③: UUID path segment
// ---------------------------------------------------------------------------
describe("analyzeCloudflare — Signal ③: UUID path segment", () => {
  it("path with valid UUID segment and no CF port → MEDIUM", () => {
    const result = analyzeCloudflare(node({
      path: "/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      port: 1234,
    }));
    expect(result.confidence).toBe("medium");
    expect(result.likelyCloudflareWorker).toBe(true);
  });

  it("path with UUID + CF port → HIGH (weight boost)", () => {
    const result = analyzeCloudflare(node({
      path: "/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/ws",
      port: 8080,
    }));
    expect(result.confidence).toBe("high");
  });

  it("path with UUID followed by ? → matched", () => {
    const result = analyzeCloudflare(node({
      path: "/prefix/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee?key=val",
      port: 1234,
    }));
    expect(result.confidence).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// Signal ④: CF-known port only
// ---------------------------------------------------------------------------
describe("analyzeCloudflare — Signal ④: CF port only", () => {
  it("port 443 alone → LOW, likelyCloudflareWorker=false", () => {
    const result = analyzeCloudflare(node({ port: 443, path: undefined }));
    expect(result.confidence).toBe("low");
    expect(result.likelyCloudflareWorker).toBe(false);
  });

  it("port 8080 alone → LOW", () => {
    const result = analyzeCloudflare(node({ port: 8080 }));
    expect(result.confidence).toBe("low");
    expect(result.likelyCloudflareWorker).toBe(false);
  });

  it("port 2053 alone → LOW", () => {
    const result = analyzeCloudflare(node({ port: 2053 }));
    expect(result.confidence).toBe("low");
    expect(result.likelyCloudflareWorker).toBe(false);
  });

  it("non-CF port 9000 alone → LOW, no port signal", () => {
    const result = analyzeCloudflare(node({ port: 9000 }));
    expect(result.confidence).toBe("low");
    expect(result.likelyCloudflareWorker).toBe(false);
    expect(result.signals.some((s) => s.includes("port"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// No signals
// ---------------------------------------------------------------------------
describe("analyzeCloudflare — no signals", () => {
  it("plain domain + non-CF port + no special path → low, false", () => {
    const result = analyzeCloudflare(node({ address: "example.com", port: 9000, path: "/path" }));
    expect(result.likelyCloudflareWorker).toBe(false);
    expect(result.confidence).toBe("low");
    expect(result.signals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Real-world fixture: BPB-Panel / vless-cf style config
// ---------------------------------------------------------------------------
describe("analyzeCloudflare — real-world fixture", () => {
  it("*.workers.dev address + ed=2048 path → HIGH confidence, all signals present", () => {
    const result = analyzeCloudflare(node({
      address: "bpb-panel.myworker.workers.dev",
      port: 443,
      path: "/sub/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee?ed=2048",
      host: "bpb-panel.myworker.workers.dev",
      sni: "bpb-panel.myworker.workers.dev",
    }));
    expect(result.likelyCloudflareWorker).toBe(true);
    expect(result.confidence).toBe("high");
    // At minimum the domain signal and the early-data signal should be present.
    expect(result.signals.some((s) => s.includes("workers.dev"))).toBe(true);
    expect(result.signals.some((s) => s.includes("ed="))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Negative cases
// ---------------------------------------------------------------------------
describe("analyzeCloudflare — negative / non-Cloudflare cases", () => {
  it("domain ends with .cloudflare.com (CDN, NOT Worker) → no domain signal", () => {
    // A custom domain behind Cloudflare's reverse-proxy is NOT a Worker endpoint.
    const result = analyzeCloudflare(node({ address: "api.cloudflare.com", port: 9000 }));
    // No .workers.dev or .pages.dev suffix → no domain signal.
    expect(result.signals.some((s) => s.includes("suffix"))).toBe(false);
    expect(result.likelyCloudflareWorker).toBe(false);
  });

  it("UUID in query string (not path segment) → not matched by UUID_PATH_RE", () => {
    const result = analyzeCloudflare(node({
      path: "/ws?id=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      port: 9000,
    }));
    expect(result.signals.some((s) => s.includes("UUID"))).toBe(false);
  });

  it("raw IPv4 address (not a CF domain) → no domain signal", () => {
    const result = analyzeCloudflare(node({ address: "1.2.3.4", port: 9000 }));
    expect(result.signals.some((s) => s.includes("suffix"))).toBe(false);
    expect(result.likelyCloudflareWorker).toBe(false);
  });
});
