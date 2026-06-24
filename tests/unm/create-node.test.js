import { describe, it, expect } from "vitest";
import { createNode, withValidation, deepFreeze } from "../../core/unm/create-node.js";
import { vlessInput } from "../setup/factories.js";

describe("createNode — invariants (05-UNIVERSAL_NODE_MODEL)", () => {
  it("generates nodeId, createdAt, updatedAt (never from input)", () => {
    const node = createNode(/** @type {any} */ ({
      ...vlessInput(),
      nodeId: "ATTACKER-SUPPLIED",
      createdAt: "1999-01-01T00:00:00.000Z",
    }));
    expect(node.nodeId).not.toBe("ATTACKER-SUPPLIED");
    expect(node.nodeId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(node.createdAt).not.toBe("1999-01-01T00:00:00.000Z");
    expect(new Date(node.createdAt).toString()).not.toBe("Invalid Date");
    expect(node.createdAt).toBe(node.updatedAt);
  });

  it("guarantees metadata arrays are never null (Rule 5)", () => {
    const node = createNode(/** @type {any} */ (vlessInput()));
    expect(node.metadata.warnings).toEqual([]);
    expect(node.metadata.errors).toEqual([]);
    expect(node.metadata.recoveryActions).toEqual([]);
    expect(node.metadata.originalMappings).toEqual({});
  });

  it("applies network/security defaults", () => {
    const node = createNode(/** @type {any} */ ({
      sourceType: "trojan-url", protocol: "trojan", address: "1.2.3.4", port: 8443,
    }));
    expect(node.network).toBe("tcp");
    expect(node.security).toBe("none");
  });

  it("always attaches a ValidationObject", () => {
    const node = createNode(/** @type {any} */ (vlessInput()));
    expect(node.validation).toBeDefined();
    expect(node.validation.overallValid).toBe(false); // not yet validated
  });

  it("returns a deep-frozen node (Rule 8 — Immutable)", () => {
    const node = createNode(/** @type {any} */ (vlessInput()));
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.metadata)).toBe(true);
    expect(Object.isFrozen(node.metadata.warnings)).toBe(true);
    expect(() => {
      /** @type {any} */ (node).port = 1;
    }).toThrow();
  });

  it("throws on invalid protocol / sourceType / address / port", () => {
    expect(() => createNode(/** @type {any} */ ({ ...vlessInput(), protocol: "nope" }))).toThrow();
    expect(() => createNode(/** @type {any} */ ({ ...vlessInput(), sourceType: "nope" }))).toThrow();
    expect(() => createNode(/** @type {any} */ ({ ...vlessInput(), address: "" }))).toThrow();
    expect(() => createNode(/** @type {any} */ ({ ...vlessInput(), port: 1.5 }))).toThrow();
  });
});

describe("withValidation — structural sharing", () => {
  it("returns a new frozen node, leaves the original untouched", () => {
    const node = createNode(/** @type {any} */ (vlessInput()));
    const v = { ...node.validation, overallValid: true };
    const next = withValidation(node, v);
    expect(next).not.toBe(node);
    expect(next.validation.overallValid).toBe(true);
    expect(node.validation.overallValid).toBe(false);
    expect(next.nodeId).toBe(node.nodeId);
    expect(Object.isFrozen(next)).toBe(true);
  });
});

describe("deepFreeze", () => {
  it("freezes nested objects and arrays", () => {
    const o = deepFreeze({ a: { b: [1, 2] } });
    expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(o.a)).toBe(true);
    expect(Object.isFrozen(o.a.b)).toBe(true);
  });
});
