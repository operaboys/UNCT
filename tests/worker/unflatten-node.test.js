/**
 * unflattenNode round-trip tests — proves `core/worker/unflatten-node.js` is
 * an exact, lossless inverse of the already-tested `parser.worker.js#flattenNode`
 * (see tests/worker/parser-worker.test.js), and that it re-applies the
 * project's deep-freeze Immutability convention (Rule 8) on the reconstructed
 * node — required by `ui/store/parser-worker-client.ts`, which uses this to
 * turn a real Worker's flat wire result back into a real `UNMNode` before
 * handing it to `core/store/parser-state.js`.
 */
import { describe, it, expect } from "vitest";
import { createNode } from "../../core/unm/create-node.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import { flattenNode } from "../../core/worker/parser.worker.js";
import { unflattenNode } from "../../core/worker/unflatten-node.js";

/**
 * Build a type-correct AnalysisObject fixture (mirrors tests/store/selectors.test.js's
 * `analysisWithScore` — same need to pin `dnsLeakRisk`'s string literal to its union type).
 * @param {Partial<import("../../core/types/unm").AnalysisObject>} [overrides]
 * @returns {import("../../core/types/unm").AnalysisObject}
 */
function analysisFixture(overrides = {}) {
  return {
    riskScore: 0, securityScore: 0, compatibilityScore: 0,
    cloudflareDetected: false, realityDetected: false, workerDetected: false,
    cleanIPDetected: false, dnsLeakRisk: "none",
    ...overrides,
  };
}

describe("unflattenNode — exact inverse of flattenNode", () => {
  it("round-trips a node that only has metadata + validation (the common post-Parser shape)", () => {
    const node = applyValidation(createNode({
      sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
    }));

    const restored = unflattenNode(flattenNode(node));

    expect(restored).toEqual(node);
    expect(restored.analysis).toBeUndefined();
    expect(restored.conversion).toBeUndefined();
  });

  it("round-trips a node that also has analysis + conversion attached", () => {
    const base = applyValidation(createNode({
      sourceType: "vmess-url", protocol: "vmess", address: "b.example.com", port: 443, uuid: "uuid-2",
    }));
    const node = {
      ...base,
      analysis: analysisFixture({ riskScore: 12, securityScore: 88, compatibilityScore: 100, cleanIPDetected: true, dnsLeakRisk: "low" }),
      conversion: {
        canExportAsUrl: true, canExportAsXrayJson: true,
        canExportAsSingboxJson: true, canExportAsClashYaml: true,
      },
    };

    const restored = unflattenNode(flattenNode(node));

    expect(restored).toEqual(node);
  });

  it("treats a falsy-but-present analysis field (riskScore: 0) as present, not absent", () => {
    const base = applyValidation(createNode({
      sourceType: "trojan-url", protocol: "trojan", address: "c.example.com", port: 443, password: "pw",
    }));
    const node = { ...base, analysis: analysisFixture() };

    const restored = unflattenNode(flattenNode(node));

    expect(restored.analysis).toEqual(node.analysis);
  });

  it("deep-freezes the reconstructed node and its sub-objects (Rule 8)", () => {
    const node = applyValidation(createNode({
      sourceType: "ss-url", protocol: "shadowsocks", address: "d.example.com", port: 8388,
      method: "aes-256-gcm", password: "pw2",
    }));

    const restored = unflattenNode(flattenNode(node));

    expect(Object.isFrozen(restored)).toBe(true);
    expect(Object.isFrozen(restored.metadata)).toBe(true);
    expect(Object.isFrozen(restored.validation)).toBe(true);
    expect(Object.isFrozen(restored.metadata.warnings)).toBe(true);
  });
});
