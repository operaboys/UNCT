/**
 * Regression — Xray Parser rejected a root-level Array of complete Xray
 * config documents ("Unknown Format" / PARSE_CONTRACT_VIOLATION).
 *
 * The bug: `detectXray()`/`toOutbounds()` (`core/parser/xray/detect.js`,
 * `core/parser/xray/extract.js`) assumed the JSON root was always a single
 * Xray object (`config.outbounds`/`config.outbound`/`config.protocol` +
 * `config.settings`). Some exporters (e.g. v2rayN) instead write a JSON
 * ARRAY of several complete Xray documents, each with its own `outbounds`.
 * Every one of `detectXray`'s conditions checked fields on the array itself
 * (which has none of them — they live on each array ELEMENT), so real
 * user files in this shape scored 0 and failed to parse entirely.
 *
 * `collectOutbounds()` now recurses into a root-level Array (see
 * `extract.js`); this is the direct regression + scale proof: a real user
 * hit this with a ~1500-2000-config array — this test builds a synthetic
 * array of the same order of magnitude and proves the PARSE step itself
 * (not just the render step `tests/e2e/subscription-virtual-list.spec.js`
 * already covers) completes in a reasonable time without crashing, and that
 * every valid document really produces a node.
 */
import { describe, it, expect } from "vitest";
import { detectXray } from "../../core/parser/xray/detect.js";
import { parseXray } from "../../core/parser/xray/extract.js";
import { normalizeManyXray } from "../../core/parser/xray/normalize.js";

const DOC_COUNT = 1800;

/** @param {number} count */
function buildV2rayNArrayExport(count) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    const host = `host-${String(i).padStart(4, "0")}.example.com`;
    docs.push({
      log: { loglevel: "warning" },
      outbounds: [
        {
          protocol: "vless",
          tag: `proxy-${i}`,
          settings: {
            vnext: [{
              address: host,
              port: 443,
              users: [{ id: "b831381d-6324-4d53-ad4f-8cda48b30811", encryption: "none" }],
            }],
          },
          streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: host } },
        },
        { protocol: "freedom", tag: "direct" },
      ],
    });
  }
  return JSON.stringify(docs);
}

describe("Xray Parser — root-level Array export at real-world scale (~1500-2000 configs)", () => {
  it(`detects, parses, and normalizes a ${DOC_COUNT}-document array in a reasonable time, with no crash`, () => {
    const input = buildV2rayNArrayExport(DOC_COUNT);

    const startedAt = Date.now();

    const confidence = detectXray(input);
    expect(confidence).toBeGreaterThan(0);

    const extraction = parseXray(input);
    const nodes = normalizeManyXray(extraction);

    const elapsedMs = Date.now() - startedAt;

    // One real node per document (the `freedom` sibling in each document
    // must never fabricate a node, and must never block the real one).
    expect(nodes).toHaveLength(DOC_COUNT);
    expect(nodes.every((n) => n.protocol === "vless")).toBe(true);
    expect(nodes[0].address).toBe("host-0000.example.com");
    expect(nodes[DOC_COUNT - 1].address).toBe(`host-${String(DOC_COUNT - 1).padStart(4, "0")}.example.com`);

    // Reasonable = seconds, not minutes. Generous on purpose (CI machines
    // vary), but a real crash/hang would blow well past this regardless.
    expect(elapsedMs).toBeLessThan(10_000);
  });
});
