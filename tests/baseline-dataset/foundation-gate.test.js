/**
 * Phase 1 Foundation Acceptance Gate (15-TESTING_FRAMEWORK §6).
 *
 * Phase 1 cannot advance to Phase 2 unless this suite is green. It gates the
 * layers that exist now: UNM construction + the Validation Engine. The raw-config
 * Parser pass-rate portion is added in Phase 2/3 (see README in this folder).
 */
import { describe, it, expect } from "vitest";
import { createNode } from "../../core/unm/create-node.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import { maxSeverity } from "../../core/errors/registry.js";
import { validateNode } from "../../core/validator/validate-node.js";
import {
  VALID_FIXTURES, INVALID_FIXTURES, UNCONSTRUCTIBLE_FIXTURES,
} from "./unm-fixtures.js";

describe("Foundation Acceptance Gate", () => {
  it("VALID fixtures cover all 7 protocols", () => {
    const protocols = new Set(VALID_FIXTURES.map((f) => f.input.protocol));
    expect([...protocols].sort()).toEqual([
      "hysteria2", "shadowsocks", "trojan", "tuic", "vless", "vmess", "wireguard",
    ]);
  });

  it("VALID fixtures build + validate at a pass rate ≥ 95%", () => {
    let passed = 0;
    /** @type {string[]} */
    const failures = [];
    for (const { name, input } of VALID_FIXTURES) {
      try {
        const node = createNode(/** @type {any} */ (input));
        const validated = applyValidation(node);
        if (validated.validation.overallValid === true) passed += 1;
        else failures.push(`${name}: ${validated.metadata.errors.join("; ")}`);
      } catch (e) {
        failures.push(`${name}: threw ${(e instanceof Error ? e.message : String(e))}`);
      }
    }
    const rate = passed / VALID_FIXTURES.length;
    // Surface which fixtures failed if the gate trips.
    expect(failures, failures.join("\n")).toEqual([]);
    expect(rate).toBeGreaterThanOrEqual(0.95);
  });

  it("INVALID fixtures are all flagged (overallValid === false)", () => {
    /** @type {string[]} */
    const missed = [];
    for (const { name, input } of INVALID_FIXTURES) {
      const node = createNode(/** @type {any} */ (input));
      const { validation } = validateNode(node);
      if (validation.overallValid !== false) missed.push(name);
    }
    // False-positive guard (15 §7): the engine must not pass invalid configs.
    expect(missed, `missed: ${missed.join(", ")}`).toEqual([]);
  });

  it("UNCONSTRUCTIBLE fixtures are rejected at the UNM boundary (createNode throws)", () => {
    for (const { name, input } of UNCONSTRUCTIBLE_FIXTURES) {
      expect(() => createNode(/** @type {any} */ (input)), name).toThrow();
    }
  });

  it("no Critical Failure: validating any VALID fixture never yields a critical diagnostic", () => {
    for (const { name, input } of VALID_FIXTURES) {
      const node = createNode(/** @type {any} */ (input));
      const { diagnostics } = validateNode(node);
      const worst = maxSeverity(diagnostics);
      expect(worst === null || worst !== "critical", name).toBe(true);
    }
  });
});
