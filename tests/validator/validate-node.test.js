import { describe, it, expect } from "vitest";
import { validateNode } from "../../core/validator/validate-node.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import { createNode } from "../../core/unm/create-node.js";
import { vlessNode } from "../setup/factories.js";

/** @param {Record<string, unknown>} o */
const node = (o) => createNode(/** @type {any} */ (o));

describe("validateNode — per-field + overall (Stage 13)", () => {
  it("a well-formed VLESS+TLS node is fully valid", () => {
    const { validation, diagnostics } = validateNode(vlessNode());
    expect(validation.addressValid).toBe(true);
    expect(validation.portValid).toBe(true);
    expect(validation.uuidValid).toBe(true);
    expect(validation.overallValid).toBe(true);
    expect(diagnostics).toHaveLength(0);
  });

  it("uuidValid is null for protocols without uuid (trojan)", () => {
    const { validation } = validateNode(node({
      sourceType: "trojan-url", protocol: "trojan", address: "1.2.3.4", port: 443,
      password: "secret", security: "none",
    }));
    expect(validation.uuidValid).toBeNull();
  });

  it("flags an out-of-range port and invalid address as errors", () => {
    const { validation, diagnostics } = validateNode(node({
      sourceType: "trojan-url", protocol: "trojan", address: "1.2.3.4", port: 443,
    }));
    // build a deliberately broken one via direct object (bypassing factory checks)
    const broken = { ...vlessNode(), address: "bad host", port: 70000 };
    const r = validateNode(/** @type {any} */ (broken));
    expect(r.validation.addressValid).toBe(false);
    expect(r.validation.portValid).toBe(false);
    expect(r.validation.overallValid).toBe(false);
    expect(r.diagnostics.map((d) => d.code)).toContain("VAL_ADDRESS_INVALID");
    expect(r.diagnostics.map((d) => d.code)).toContain("VAL_PORT_OUT_OF_RANGE");
    // sanity: the valid trojan node above is fine
    expect(validation.overallValid).toBe(true);
  });

  it("VLESS with a bad uuid fails uuidValid", () => {
    const broken = { ...vlessNode({ uuid: "nope" }) };
    const { validation, diagnostics } = validateNode(/** @type {any} */ (broken));
    expect(validation.uuidValid).toBe(false);
    expect(validation.overallValid).toBe(false);
    expect(diagnostics.map((d) => d.code)).toContain("VAL_UUID_INVALID");
  });

  it("reality requires pbk (cross-field error)", () => {
    const withPbk = node({
      sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
      uuid: "b831381d-6324-4d53-ad4f-8cda48b30811", security: "reality",
      pbk: "somepublickey", sid: "ab",
    });
    expect(validateNode(withPbk).validation.realityValid).toBe(true);

    const withoutPbk = node({
      sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
      uuid: "b831381d-6324-4d53-ad4f-8cda48b30811", security: "reality",
    });
    const r = validateNode(withoutPbk);
    expect(r.validation.realityValid).toBe(false);
    expect(r.validation.overallValid).toBe(false);
    expect(r.diagnostics.map((d) => d.code)).toContain("VAL_REALITY_NO_PBK");
  });

  it("tls without sni is only a warning (overall stays valid)", () => {
    const n = node({
      sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
      uuid: "b831381d-6324-4d53-ad4f-8cda48b30811", security: "tls",
    });
    const r = validateNode(n);
    expect(r.validation.tlsValid).toBe(true);
    expect(r.validation.overallValid).toBe(true);
    expect(r.diagnostics.map((d) => d.code)).toContain("VAL_TLS_NO_SNI");
    expect(r.diagnostics.find((d) => d.code === "VAL_TLS_NO_SNI")?.severity).toBe("warning");
  });

  it("alpn: structurally broken fails, unknown id is only a warning", () => {
    const broken = { ...vlessNode(), alpn: "h2" }; // not an array
    const r1 = validateNode(/** @type {any} */ (broken));
    expect(r1.validation.alpnValid).toBe(false);
    expect(r1.diagnostics.map((d) => d.code)).toContain("VAL_ALPN_INVALID");

    const unknown = { ...vlessNode(), alpn: ["h2", "weird-proto"] };
    const r2 = validateNode(/** @type {any} */ (unknown));
    expect(r2.validation.alpnValid).toBe(true); // structurally fine
    expect(r2.validation.overallValid).toBe(true); // warning does not fail it
    expect(r2.diagnostics.find((d) => d.code === "VAL_ALPN_INVALID")?.severity).toBe("warning");
  });

  it("wireguard with a broken endpoint emits VAL_WIREGUARD_NO_ENDPOINT", () => {
    const wg = createNode(/** @type {any} */ ({
      sourceType: "wireguard-config", protocol: "wireguard", address: "wg.example.com",
      port: 51820, security: "none",
    }));
    const broken = { ...wg, address: "bad host" };
    const r = validateNode(/** @type {any} */ (broken));
    expect(r.validation.overallValid).toBe(false);
    expect(r.diagnostics.map((d) => d.code)).toContain("VAL_WIREGUARD_NO_ENDPOINT");
  });

  it("optional fields are null when absent", () => {
    const { validation } = validateNode(node({
      sourceType: "trojan-url", protocol: "trojan", address: "1.2.3.4", port: 443,
      security: "none",
    }));
    expect(validation.alpnValid).toBeNull();
    expect(validation.pathValid).toBeNull();
    expect(validation.hostValid).toBeNull();
    expect(validation.tlsValid).toBeNull();
    expect(validation.realityValid).toBeNull();
  });
});

describe("applyValidation — folds result into an immutable node", () => {
  it("sets node.validation and merges diagnostics into metadata", () => {
    const broken = { ...vlessNode({ uuid: "nope" }) };
    const validated = applyValidation(/** @type {any} */ (broken));
    expect(validated.validation.uuidValid).toBe(false);
    expect(validated.metadata.errors.some((e) => e.startsWith("VAL_UUID_INVALID"))).toBe(true);
    expect(Object.isFrozen(validated)).toBe(true);
  });

  it("does not mutate the input node", () => {
    const original = vlessNode();
    const validated = applyValidation(original);
    expect(validated).not.toBe(original);
    expect(original.validation.overallValid).toBe(false); // untouched
    expect(validated.validation.overallValid).toBe(true);
  });
});
