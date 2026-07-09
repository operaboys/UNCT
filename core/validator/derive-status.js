/**
 * Derived node status (ADR-030) — a pure, reversible presentation-layer
 * projection over data the Validation Engine and Recovery Strategy fallback
 * chain already compute. Adds NO new validation rule, changes NO
 * `ValidationObject` field, and never mutates/re-parses a node: flipping
 * Strict Validation or Auto-repair in Settings only changes what
 * `deriveNodeStatus` RETURNS for the exact same, already-stored node.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {"valid" | "warning" | "rejected" | "invalid"} NodeStatus
 */

/**
 * A node has a Validation-layer warning when one of its `metadata.warnings`
 * entries originated from the `VAL` diagnostic layer (`core/errors/
 * registry.js`) — by construction, every `VAL_*` code is `warning` severity
 * (an `error`/`critical`-severity `VAL_*` diagnostic already went to
 * `metadata.errors` instead, in `core/validator/apply-validation.js`, and
 * already flipped `overallValid` to `false`). `security: "none"` produces
 * zero `VAL_*` diagnostics in `validate-node.js` — "no TLS" alone can never
 * satisfy this check (ADR-030 Decision 1).
 * @param {UNMNode} node
 * @returns {boolean}
 */
export function hasValidationWarning(node) {
  return node.metadata.warnings.some((w) => w.startsWith("VAL_"));
}

/**
 * A node went through a parser's `recover()` (Recovery Strategy fallback
 * chain, 12-PARSER_FACTORY §5) when its `metadata.recoveryActions` is
 * non-empty — every parser's own `normalize.js` already copies
 * `extraction.recoveryActions` onto the node whenever `recover()` produced
 * the extraction (ADR-030 Decision 2).
 * @param {UNMNode} node
 * @returns {boolean}
 */
export function hasRecoveryActions(node) {
  return node.metadata.recoveryActions.length > 0;
}

/**
 * @param {UNMNode} node
 * @param {{ strictValidation: boolean, autoRepair: boolean }} settings
 * @returns {NodeStatus}
 */
export function deriveNodeStatus(node, settings) {
  if (!node.validation.overallValid) return "invalid";
  if (hasValidationWarning(node)) {
    return settings.strictValidation ? "rejected" : "warning";
  }
  if (!settings.autoRepair && hasRecoveryActions(node)) return "warning";
  return "valid";
}
