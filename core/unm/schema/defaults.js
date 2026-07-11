/**
 * UNM defaults — the canonical empty/neutral sub-objects every node carries.
 *
 * Spec 05 invariants enforced here:
 *  - metadata.warnings / errors are never null — always arrays (Rule 5)
 *  - validation is always present after Parse (§5)
 *  - network defaults to "tcp", security to "none" (§2)
 *
 * @typedef {import("../../types/unm").MetadataObject} MetadataObject
 * @typedef {import("../../types/unm").ValidationObject} ValidationObject
 */

/** Default network transport when a parser does not specify one. */
export const DEFAULT_NETWORK = "tcp";

/** Default security when a parser does not specify one. */
export const DEFAULT_SECURITY = "none";

/**
 * A fresh MetadataObject with all array fields initialized empty (never null).
 * @returns {MetadataObject}
 */
export function emptyMetadata() {
  return {
    parser: "",
    confidence: 0,
    warnings: [],
    errors: [],
    recoveryActions: [],
    originalMappings: {},
  };
}

/**
 * A fresh "unknown" ValidationObject — every per-field flag is `null` (not yet
 * judged / not meaningful) and overallValid is false until the Validation
 * Engine runs. The engine returns a NEW object; it never mutates this one.
 * @returns {ValidationObject}
 */
export function emptyValidation() {
  return {
    addressValid: false,
    portValid: false,
    uuidValid: null,
    realityValid: null,
    tlsValid: null,
    alpnValid: null,
    pathValid: null,
    hostValid: null,
    overallValid: false,
  };
}
