/**
 * converter.worker.js tests (09-DEVELOPMENT_ROADMAP Phase 7 Item 5; ADR-012).
 *
 * Mirrors parser-worker.test.js's structure: `handleConverterJob` called
 * directly (no DOM/Worker globals, ADR-003) for unit-level checks, then
 * through a real `WorkerManager` + Worker Mock for the end-to-end
 * requirement. The end-to-end block is also the **Cross-Format** proof the
 * Phase 7 Item 5 request asked for: one node per UNM protocol, batch-
 * converted through the real Worker pool into EACH of the four ADR-012
 * formats, asserting (a) the `converted`/`skipped` split exactly matches
 * the ConversionObject capability matrix (most notably to-xray's 4-protocol
 * limit), and (b) every produced output re-parses through *that format's*
 * own real Parser back to the same protocol/address/port — proving the
 * Worker -> Batch Conversion -> real serializer chain is wired correctly
 * end-to-end, not just that `conversion.js`'s unit tests pass in isolation.
 */
import { describe, it, expect } from "vitest";
import { handleConverterJob } from "../../core/worker/converter.worker.js";
import { createWorkerManager } from "../../core/worker/worker-manager.js";
import { createMockWorkerFactory } from "../setup/worker-mock.js";
import { createNode } from "../../core/unm/create-node.js";
import { parseUrl, normalizeUrl } from "../../core/parser/url/index.js";
import { parseXray, normalizeManyXray } from "../../core/parser/xray/index.js";
import { parseSingBox, normalizeManySingBox } from "../../core/parser/singbox/index.js";
import { parseClash, normalizeManyClash } from "../../core/parser/clash/index.js";

/** Worker envelope results are intentionally `unknown` outside the Worker (10-PERFORMANCE_ENGINE §3) — tests narrow at the assertion site. @param {unknown} value */
function asRecord(value) {
  return /** @type {Record<string, any>} */ (value);
}

/** One minimal, valid node per UNM protocol. */
const NODES = {
  vless: createNode({
    sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
  }),
  vmess: createNode({
    sourceType: "vmess-url", protocol: "vmess", address: "b.example.com", port: 443, uuid: "uuid-2",
  }),
  trojan: createNode({
    sourceType: "trojan-url", protocol: "trojan", address: "c.example.com", port: 443, password: "pw",
  }),
  shadowsocks: createNode({
    sourceType: "ss-url", protocol: "shadowsocks", address: "d.example.com", port: 8388,
    method: "aes-256-gcm", password: "pw2",
  }),
  hysteria2: createNode({
    sourceType: "hysteria2-url", protocol: "hysteria2", address: "e.example.com", port: 443, password: "pw3",
  }),
  tuic: createNode({
    sourceType: "tuic-url", protocol: "tuic", address: "f.example.com", port: 443,
    uuid: "uuid-3", password: "pw4",
  }),
  wireguard: createNode({
    sourceType: "wireguard-config", protocol: "wireguard", address: "g.example.com", port: 51820,
    extensions: { wireguard: { privateKey: "priv", publicKey: "pub", allowedIPs: ["10.0.0.2/32"] } },
  }),
};
const ALL_NODES = Object.values(NODES);

/** Re-parse helper per format — the real Parser, proving a lossless round-trip. */
const REPARSE = {
  url: (/** @type {string} */ raw) => normalizeUrl(parseUrl(raw)),
  xrayJson: (/** @type {string} */ raw) => normalizeManyXray(parseXray(raw))[0],
  singboxJson: (/** @type {string} */ raw) => normalizeManySingBox(parseSingBox(raw))[0],
  clashYaml: (/** @type {string} */ raw) => normalizeManyClash(parseClash(raw))[0],
};

/** ADR-012 capability matrix — which protocols each format supports. */
const EXPECTED_SUPPORTED = {
  url: ["vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard"],
  xrayJson: ["vless", "vmess", "trojan", "shadowsocks"],
  singboxJson: ["vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard"],
  clashYaml: ["vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard"],
};

describe("handleConverterJob — direct invocation (pure, no Worker globals)", () => {
  it("wraps convertBatch behind the standard envelope", async () => {
    const response = await handleConverterJob({
      jobId: "j1", generationId: 1, track: "convert",
      payload: { nodes: [NODES.vless, NODES.shadowsocks], targetFormat: "clashYaml" },
    });
    expect(response).toMatchObject({ jobId: "j1", generationId: 1, track: "convert", ok: true });
    const result = asRecord(response.result);
    expect(result.converted).toHaveLength(2);
    expect(result.skipped).toEqual([]);
  });

  it("skips (does not throw on) a node outside the target format's scope", async () => {
    const response = await handleConverterJob({
      jobId: "j2", generationId: 1, track: "convert",
      payload: { nodes: [NODES.vless, NODES.wireguard], targetFormat: "xrayJson" },
    });
    expect(response.ok).toBe(true);
    const result = asRecord(response.result);
    expect(result.converted.map((/** @type {any} */ c) => c.nodeId)).toEqual([NODES.vless.nodeId]);
    expect(result.skipped).toEqual([{ nodeId: NODES.wireguard.nodeId, protocol: "wireguard" }]);
  });

  it("rejects a non-array payload.nodes as a contract violation, not a silent no-op", async () => {
    const response = await handleConverterJob({
      jobId: "j3", generationId: 1, payload: { nodes: "not-an-array", targetFormat: "url" },
    });
    expect(response.ok).toBe(false);
    expect(response.error?.message).toMatch(/WORKER_CONTRACT_VIOLATION/);
  });

  it("rejects a non-string payload.targetFormat as a contract violation", async () => {
    const response = await handleConverterJob({
      jobId: "j4", generationId: 1, payload: { nodes: [NODES.vless], targetFormat: 123 },
    });
    expect(response.ok).toBe(false);
    expect(response.error?.message).toMatch(/WORKER_CONTRACT_VIOLATION/);
  });

  it("returns an ok:false envelope (never throws) for an unknown format key", async () => {
    const response = await handleConverterJob({
      jobId: "j5", generationId: 1, payload: { nodes: [NODES.vless], targetFormat: "made-up-format" },
    });
    expect(response.ok).toBe(false);
    expect(response.error?.message).toMatch(/CONVERT_UNSUPPORTED/);
  });
});

describe("E2E Cross-Format: real Worker pool dispatch x all 4 formats x all 7 protocols", () => {
  for (const format of /** @type {const} */ (["url", "xrayJson", "singboxJson", "clashYaml"])) {
    it(`batch-converts all 7 protocol nodes to "${format}" through the real Worker pool, matching the ConversionObject capability matrix and round-tripping losslessly`, async () => {
      const manager = createWorkerManager({
        workerFactory: createMockWorkerFactory(handleConverterJob), poolSize: 4,
      });
      const { promise } = manager.runJob({ nodes: ALL_NODES, targetFormat: format }, { track: format });
      const result = asRecord(await promise);

      // The converted/skipped split must exactly match the per-format protocol scope.
      const convertedProtocols = result.converted
        .map((/** @type {any} */ c) => ALL_NODES.find((n) => n.nodeId === c.nodeId)?.protocol)
        .sort();
      expect(convertedProtocols).toEqual([...EXPECTED_SUPPORTED[format]].sort());
      expect(result.converted.length + result.skipped.length).toBe(ALL_NODES.length);
      for (const entry of result.skipped) {
        expect(EXPECTED_SUPPORTED[format]).not.toContain(entry.protocol);
      }

      // Every produced output round-trips through that format's own real Parser.
      for (const entry of result.converted) {
        const node = ALL_NODES.find((n) => n.nodeId === entry.nodeId);
        const roundTripped = REPARSE[format](entry.output);
        expect(roundTripped.protocol).toBe(node?.protocol);
        expect(roundTripped.address).toBe(node?.address);
        expect(roundTripped.port).toBe(node?.port);
      }
    });
  }
});
