import { describe, it, expect } from "vitest";
import { deriveNodeStatus, hasValidationWarning, hasRecoveryActions } from "../../core/validator/derive-status.js";
import { applyValidation } from "../../core/validator/apply-validation.js";
import { vlessNode } from "../setup/factories.js";

/**
 * `vlessNode()` alone (bare `createNode()`) never runs the Validation
 * Engine, so its `validation` field is `emptyValidation()`'s default
 * (`overallValid: false`) — real screens always get their node through
 * `applyValidation()` first (`parse-and-validate.js`/`parser.worker.js`), so
 * `deriveNodeStatus` tests need that same real, computed `validation`
 * object, not the pre-validation default. `applyValidation` also appends
 * any REAL diagnostics for the given field values on top of whatever fake
 * `metadata.warnings`/`recoveryActions` the test injected — a clean
 * VLESS+TLS+SNI node (the factory's default) produces none, so the fake
 * entries this suite injects are the only ones present.
 * @param {Record<string, unknown>} [overrides]
 */
function validNode(overrides = {}) {
  return applyValidation(vlessNode(overrides));
}

describe("derive-status (ADR-030) — hasValidationWarning / hasRecoveryActions", () => {
  it("a clean node has neither a validation warning nor recovery actions", () => {
    const n = vlessNode();
    expect(hasValidationWarning(n)).toBe(false);
    expect(hasRecoveryActions(n)).toBe(false);
  });

  it("hasValidationWarning is true only for a VAL_-prefixed metadata.warnings entry", () => {
    const withValWarning = vlessNode({ metadata: { warnings: ["VAL_TLS_NO_SNI: security=tls without an SNI..."] } });
    expect(hasValidationWarning(withValWarning)).toBe(true);

    const withOtherWarning = vlessNode({ metadata: { warnings: ["PARSE_UNMAPPED_VALUE: network defaulted"] } });
    expect(hasValidationWarning(withOtherWarning)).toBe(false);
  });

  it("hasRecoveryActions is true only when metadata.recoveryActions is non-empty", () => {
    const recovered = vlessNode({ metadata: { recoveryActions: ["REC_STRUCTURE_REPAIRED: sanitized payload"] } });
    expect(hasRecoveryActions(recovered)).toBe(true);
    expect(hasRecoveryActions(vlessNode())).toBe(false);
  });
});

describe("derive-status (ADR-030) — deriveNodeStatus", () => {
  const off = { strictValidation: false, autoRepair: true };

  it("a clean node is \"valid\" regardless of toggle state", () => {
    const n = validNode();
    expect(deriveNodeStatus(n, off)).toBe("valid");
    expect(deriveNodeStatus(n, { strictValidation: true, autoRepair: false })).toBe("valid");
  });

  it("an overallValid=false node is always \"invalid\", never affected by either toggle", () => {
    const broken = { ...validNode(), validation: { ...validNode().validation, overallValid: false } };
    expect(deriveNodeStatus(/** @type {any} */ (broken), off)).toBe("invalid");
    expect(deriveNodeStatus(/** @type {any} */ (broken), { strictValidation: true, autoRepair: false })).toBe("invalid");
  });

  it("\"no TLS\" (security=none) alone never triggers a validation warning", () => {
    const n = validNode({ security: "none", sni: undefined });
    expect(hasValidationWarning(n)).toBe(false);
    expect(deriveNodeStatus(n, { strictValidation: true, autoRepair: true })).toBe("valid");
  });

  describe("Strict Validation (Decision 1)", () => {
    it("a node with a VAL_ warning is \"warning\" when Strict Validation is off", () => {
      const n = validNode({ metadata: { warnings: ["VAL_TLS_NO_SNI: security=tls without an SNI..."] } });
      expect(deriveNodeStatus(n, { strictValidation: false, autoRepair: true })).toBe("warning");
    });

    it("the SAME node is \"rejected\" when Strict Validation is on", () => {
      const n = validNode({ metadata: { warnings: ["VAL_TLS_NO_SNI: security=tls without an SNI..."] } });
      expect(deriveNodeStatus(n, { strictValidation: true, autoRepair: true })).toBe("rejected");
    });

    it("is fully reversible: toggling strictValidation back off restores \"warning\" for the identical, untouched node", () => {
      const n = validNode({ metadata: { warnings: ["VAL_ALPN_INVALID: ..."] } });
      const rejected = deriveNodeStatus(n, { strictValidation: true, autoRepair: true });
      const restored = deriveNodeStatus(n, { strictValidation: false, autoRepair: true });
      expect(rejected).toBe("rejected");
      expect(restored).toBe("warning");
    });
  });

  describe("Auto-repair (Decision 2)", () => {
    it("a recovered node reads as \"valid\" when Auto-repair is on (today's existing behavior)", () => {
      const n = validNode({ metadata: { recoveryActions: ["REC_STRUCTURE_REPAIRED: ..."] } });
      expect(deriveNodeStatus(n, { strictValidation: false, autoRepair: true })).toBe("valid");
    });

    it("the SAME recovered node reads as \"warning\" when Auto-repair is off", () => {
      const n = validNode({ metadata: { recoveryActions: ["REC_STRUCTURE_REPAIRED: ..."] } });
      expect(deriveNodeStatus(n, { strictValidation: false, autoRepair: false })).toBe("warning");
    });

    it("a non-recovered node is unaffected by Auto-repair being off", () => {
      const n = validNode();
      expect(deriveNodeStatus(n, { strictValidation: false, autoRepair: false })).toBe("valid");
    });
  });

  it("a VAL_ warning takes precedence over a recovery-only warning (both toggles active)", () => {
    const n = validNode({
      metadata: {
        warnings: ["VAL_TLS_NO_SNI: ..."],
        recoveryActions: ["REC_STRUCTURE_REPAIRED: ..."],
      },
    });
    expect(deriveNodeStatus(n, { strictValidation: true, autoRepair: false })).toBe("rejected");
  });
});
