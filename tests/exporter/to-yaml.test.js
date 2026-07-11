/**
 * YAML Export tests (08-EXPORT_ENGINE §4, ADR-004). `exportClashYaml` merges
 * each node's single-proxy Clash YAML (reusing `to-clash.js` via
 * `convertBatch`) into one multi-proxy document — the same shape Clash
 * Meta/Mihomo read and the same shape a Clash "Provider File" is, so no
 * separate code is needed for those (see to-yaml.js's doc comment).
 */
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import { exportClashYaml } from "../../core/exporter/to-yaml.js";
import { toClash } from "../../core/converter/to-clash.js";
import { createNode } from "../../core/unm/create-node.js";

const vless = createNode({
  sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
});
const shadowsocks = createNode({
  sourceType: "ss-url", protocol: "shadowsocks", address: "b.example.com", port: 8388,
  method: "aes-256-gcm", password: "pw",
});

describe("exportClashYaml", () => {
  it("merges each node's single proxy into one multi-proxy document (matches toClash per node)", () => {
    const { content, skipped } = exportClashYaml([vless, shadowsocks]);
    expect(yaml.load(content)).toEqual({
      proxies: [loadProxies(toClash(vless))[0], loadProxies(toClash(shadowsocks))[0]],
    });
    expect(skipped).toEqual([]);
  });

  it("returns an empty proxies list for an empty node list", () => {
    const { content, skipped } = exportClashYaml([]);
    expect(yaml.load(content)).toEqual({ proxies: [] });
    expect(skipped).toEqual([]);
  });

  it("surfaces (never silently drops) a node outside the UNM protocol enum", () => {
    const fake = /** @type {any} */ ({ nodeId: "fake-id", protocol: "made-up" });
    const { content, skipped } = exportClashYaml([vless, fake]);
    expect(loadProxies(content)).toHaveLength(1);
    expect(skipped).toEqual([{ nodeId: "fake-id", protocol: "made-up", reason: 'protocol "made-up" is not supported by Clash YAML export' }]);
  });
});

/**
 * @param {string} doc
 * @returns {unknown[]}
 */
function loadProxies(doc) {
  return /** @type {{proxies: unknown[]}} */ (yaml.load(doc)).proxies;
}
