/**
 * Test factories — build well-formed inputs for createNode so individual tests
 * only specify the field under test.
 */
import { createNode } from "../../core/unm/create-node.js";

/**
 * A minimal valid VLESS node input. Override any field per test.
 * @param {Record<string, unknown>} [overrides]
 */
export function vlessInput(overrides = {}) {
  return {
    sourceType: "vless-url",
    protocol: "vless",
    address: "example.com",
    port: 443,
    uuid: "b831381d-6324-4d53-ad4f-8cda48b30811",
    network: "tcp",
    security: "tls",
    sni: "example.com",
    ...overrides,
  };
}

/** Build a frozen VLESS node directly. @param {Record<string, unknown>} [overrides] */
export function vlessNode(overrides = {}) {
  return createNode(/** @type {any} */ (vlessInput(overrides)));
}
