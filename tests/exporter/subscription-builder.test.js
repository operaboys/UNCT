/**
 * Subscription Builder tests (P12-9, doc 03 §6). The headline guarantee
 * mirrors `tests/converter/to-url.test.js`'s Phase 7 Exit Condition, one
 * level up: `parseSubscription(buildSubscription(nodes).content)` must
 * reproduce the same nodes for a real mixed-protocol batch, in both Base64
 * (default) and plain-text encodings — proving this module really is the
 * exact inverse of `core/parser/subscription/` (ADR-008), not just a
 * plausible-looking one.
 */
import { describe, it, expect } from "vitest";
import { parseUrl, normalizeUrl } from "../../core/parser/url/index.js";
import { parseSubscription } from "../../core/parser/subscription/subscription-parser.js";
import { buildSubscription } from "../../core/exporter/subscription-builder.js";
import {
  VLESS_REALITY, VLESS_WS_TLS, VMESS_WS, SS_SIP002, TROJAN_WS, TUIC, HY2, WIREGUARD,
} from "../url/fixtures.js";

/** @param {string} raw */
const parse = (raw) => normalizeUrl(parseUrl(raw));

/**
 * The comparable "core" of a node — same helper as to-url.test.js: everything
 * except system-generated identity/timestamps and parse-provenance
 * metadata/validation, which legitimately differ between two independent parses.
 * @param {import("../../core/types/unm").UNMNode} node
 */
function core(node) {
  const { nodeId, createdAt, updatedAt, metadata, validation, ...rest } = node;
  return rest;
}

describe("buildSubscription — round-trips losslessly through SubscriptionParser", () => {
  const nodes = [VLESS_REALITY, VLESS_WS_TLS, VMESS_WS, SS_SIP002, TROJAN_WS, TUIC, HY2, WIREGUARD].map(parse);

  it("default (Base64) encoding: rebuilding + re-parsing yields the identical set of core nodes", () => {
    const { content, skipped } = buildSubscription(nodes);
    expect(skipped).toEqual([]);

    const { nodes: reparsed } = parseSubscription(content);
    expect(reparsed).toHaveLength(nodes.length);
    expect(reparsed.map(core)).toEqual(nodes.map(core));
  });

  it("plain-text encoding: rebuilding + re-parsing yields the identical set of core nodes", () => {
    const { content, skipped } = buildSubscription(nodes, { encoding: "plain" });
    expect(skipped).toEqual([]);

    const { nodes: reparsed } = parseSubscription(content);
    expect(reparsed).toHaveLength(nodes.length);
    expect(reparsed.map(core)).toEqual(nodes.map(core));
  });

  it("Base64 output actually decodes to the plain-text form (real encoding, not a no-op)", () => {
    const { content: base64Content } = buildSubscription(nodes, { encoding: "base64" });
    const { content: plainContent } = buildSubscription(nodes, { encoding: "plain" });

    expect(base64Content).not.toBe(plainContent);
    const decoded = decodeURIComponent(escape(atob(base64Content)));
    expect(decoded).toBe(plainContent);
  });

  it("defaults to Base64 when no options are given", () => {
    const withDefault = buildSubscription(nodes);
    const explicitBase64 = buildSubscription(nodes, { encoding: "base64" });
    expect(withDefault.content).toBe(explicitBase64.content);
  });
});

describe("buildSubscription — Templates are UNMNodes, no special-casing needed", () => {
  it("builds identically whether nodes came from the working set or a saved Template", () => {
    const workingSetNode = parse(VLESS_REALITY);
    // A "Template" is exactly this same node object, just sourced from a
    // different store (core/storage/template-store.js) — structurally
    // identical, so buildSubscription needs no Template-aware branch.
    const templateNode = workingSetNode;

    const { content } = buildSubscription([templateNode]);
    const { nodes: reparsed } = parseSubscription(content);

    expect(reparsed).toHaveLength(1);
    expect(core(reparsed[0])).toEqual(core(workingSetNode));
  });
});

describe("buildSubscription — skip reporting for unsupported protocols", () => {
  // No real UNM protocol lacks a URL scheme (URL_SUPPORTED_PROTOCOLS covers
  // every entry in the schema's protocol enum) — mirrors exactly how
  // to-txt.test.js exercises this same skip path: a made-up protocol on a
  // plain object, standing in for a future/unknown protocol convertBatch
  // must not silently drop.
  const unsupported = /** @type {any} */ ({ nodeId: "fake-id", protocol: "made-up" });

  it("reports a node with no URL scheme as skipped, labeled for Subscription (not TXT)", () => {
    const { content, skipped } = buildSubscription([unsupported]);

    expect(content).toBe("");
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("Subscription");
    expect(skipped[0].reason).not.toContain("TXT");
  });

  it("builds the supported nodes and skips only the unsupported one in a mixed batch", () => {
    const supported = parse(VLESS_REALITY);

    const { content, skipped } = buildSubscription([supported, unsupported], { encoding: "plain" });

    const { nodes: reparsed } = parseSubscription(content);
    expect(reparsed).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].nodeId).toBe("fake-id");
  });
});

describe("buildSubscription — empty input", () => {
  it("returns an empty content string and no skipped entries for an empty node list", () => {
    expect(buildSubscription([])).toEqual({ content: "", skipped: [] });
    expect(buildSubscription([], { encoding: "plain" })).toEqual({ content: "", skipped: [] });
  });
});
