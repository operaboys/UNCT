/**
 * Test helper — a minimal, contract-valid BaseParser stand-in. Parser
 * Factory tests use this instead of a real (Phase 2+) format parser.
 */
import { vlessNode } from "./factories.js";

/**
 * @param {Partial<import("../../core/types/parser").BaseParser>} [overrides]
 * @returns {import("../../core/types/parser").BaseParser}
 */
export function makeMockParser(overrides = {}) {
  return /** @type {any} */ ({
    detect: () => 90,
    parse: () => ({ fields: {} }),
    validateStructure: () => ({
      addressValid: true, portValid: true, uuidValid: null, realityValid: null,
      tlsValid: null, alpnValid: null, pathValid: null, hostValid: null, overallValid: true,
    }),
    normalize: () => vlessNode(),
    recover: () => null,
    ...overrides,
  });
}
