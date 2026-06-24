/**
 * Error Code Registry — single source of truth for every diagnostic code the
 * Foundation Layer can emit (Phase 1 deliverable, 09-DEVELOPMENT_ROADMAP).
 *
 * Pure data + lookup. No DOM, no Worker, no I/O — directly unit-testable
 * (15-TESTING_FRAMEWORK §Testing Infrastructure).
 *
 * @typedef {import("../types/errors").ErrorCodeDef} ErrorCodeDef
 * @typedef {import("../types/errors").Diagnostic} Diagnostic
 * @typedef {import("../types/errors").ErrorSeverity} ErrorSeverity
 */

/**
 * The registry. Keyed by code. Adding a new code here is the ONLY sanctioned way
 * to introduce a diagnostic — producers must reference a registered code so the
 * Debug Console (04-PARSER_ENGINE §5) can always explain a failure.
 *
 * @type {Readonly<Record<string, ErrorCodeDef>>}
 */
export const ERROR_CODES = Object.freeze({
  // ----- Preprocessor (Stage 01) -----
  PRE_EMPTY_INPUT:        { code: "PRE_EMPTY_INPUT",        layer: "PRE",   severity: "error",    message: "Input is empty after preprocessing." },
  PRE_BROKEN_BASE64:      { code: "PRE_BROKEN_BASE64",      layer: "PRE",   severity: "warning",  message: "Base64 segment was malformed and repaired." },
  PRE_INVALID_ENCODING:   { code: "PRE_INVALID_ENCODING",   layer: "PRE",   severity: "warning",  message: "Invalid UTF-8 / URL encoding was repaired." },

  // ----- Format Detector (Stage 02) -----
  DET_UNKNOWN_FORMAT:     { code: "DET_UNKNOWN_FORMAT",     layer: "DET",   severity: "error",    message: "Input format could not be detected (confidence below threshold)." },
  DET_LOW_CONFIDENCE:     { code: "DET_LOW_CONFIDENCE",     layer: "DET",   severity: "warning",  message: "Format detected with low confidence; alternatives exist." },

  // ----- Parsing / field extraction (Stages 04-09) -----
  PARSE_MISSING_REQUIRED: { code: "PARSE_MISSING_REQUIRED", layer: "PARSE", severity: "error",    message: "A required field is missing from the input." },
  PARSE_UNKNOWN_FIELD:    { code: "PARSE_UNKNOWN_FIELD",    layer: "PARSE", severity: "info",     message: "An unrecognized field was ignored." },
  PARSE_UNMAPPED_VALUE:   { code: "PARSE_UNMAPPED_VALUE",   layer: "PARSE", severity: "warning",  message: "A value was not found in the normalization map; protocol default applied." },
  PARSE_DNS_AS_ADDRESS:   { code: "PARSE_DNS_AS_ADDRESS",   layer: "PARSE", severity: "warning",  message: "A DNS address was about to be used as a node address; ignored." },

  // ----- Recovery (Stages 10-11) -----
  REC_STRUCTURE_REPAIRED: { code: "REC_STRUCTURE_REPAIRED", layer: "REC",   severity: "info",     message: "Broken structure was recovered." },
  REC_KEY_FUZZY_MATCHED:  { code: "REC_KEY_FUZZY_MATCHED",  layer: "REC",   severity: "info",     message: "A misspelled key was fuzzy-matched to a known field." },
  REC_PARTIAL_CONFIG:     { code: "REC_PARTIAL_CONFIG",     layer: "REC",   severity: "warning",  message: "Only part of the configuration could be recovered." },

  // ----- Validation (Stage 13) -----
  VAL_ADDRESS_INVALID:    { code: "VAL_ADDRESS_INVALID",    layer: "VAL",   severity: "error",    message: "Address is neither a valid domain nor a valid IP." },
  VAL_PORT_OUT_OF_RANGE:  { code: "VAL_PORT_OUT_OF_RANGE",  layer: "VAL",   severity: "error",    message: "Port must be an integer in the range 1-65535." },
  VAL_UUID_INVALID:       { code: "VAL_UUID_INVALID",       layer: "VAL",   severity: "error",    message: "UUID is not a valid UUID for this protocol." },
  VAL_REALITY_NO_PBK:     { code: "VAL_REALITY_NO_PBK",     layer: "VAL",   severity: "error",    message: "security=reality requires a public key (pbk)." },
  VAL_TLS_NO_SNI:         { code: "VAL_TLS_NO_SNI",         layer: "VAL",   severity: "warning",  message: "security=tls without an SNI may fail on SNI-strict servers." },
  VAL_ALPN_INVALID:       { code: "VAL_ALPN_INVALID",       layer: "VAL",   severity: "warning",  message: "ALPN contains an unrecognized protocol identifier." },
  VAL_PATH_INVALID:       { code: "VAL_PATH_INVALID",       layer: "VAL",   severity: "warning",  message: "Path is malformed for the selected transport." },
  VAL_HOST_INVALID:       { code: "VAL_HOST_INVALID",       layer: "VAL",   severity: "warning",  message: "Host header is not a valid hostname." },
  VAL_WIREGUARD_NO_ENDPOINT: { code: "VAL_WIREGUARD_NO_ENDPOINT", layer: "VAL", severity: "error", message: "WireGuard requires an endpoint (address:port)." },

  // ----- Node construction invariants (UNM) -----
  UNM_INVARIANT_VIOLATION: { code: "UNM_INVARIANT_VIOLATION", layer: "UNM", severity: "critical", message: "A UNM invariant was violated during node construction." },
});

/** Severity ordering for comparisons / max-severity reductions. */
const SEVERITY_RANK = Object.freeze({ info: 0, warning: 1, error: 2, critical: 3 });

/**
 * @param {string} code
 * @returns {ErrorCodeDef | undefined}
 */
export function getErrorDef(code) {
  return ERROR_CODES[code];
}

/**
 * Build a runtime Diagnostic from a registered code. Throws if the code is not
 * registered — an unregistered diagnostic is itself a bug (Parser must prove,
 * not guess; 04-PARSER_ENGINE §5).
 *
 * @param {string} code
 * @param {{ field?: string, detail?: string, message?: string }} [ctx]
 * @returns {Diagnostic}
 */
export function makeDiagnostic(code, ctx = {}) {
  const def = ERROR_CODES[code];
  if (!def) {
    throw new Error(`Unregistered error code: ${code}`);
  }
  /** @type {Diagnostic} */
  const diag = {
    code: def.code,
    layer: def.layer,
    severity: def.severity,
    message: ctx.message ?? def.message,
  };
  if (ctx.field !== undefined) diag.field = ctx.field;
  if (ctx.detail !== undefined) diag.detail = ctx.detail;
  return diag;
}

/**
 * Compare two severities. Returns >0 if `a` is more severe than `b`.
 * @param {ErrorSeverity} a
 * @param {ErrorSeverity} b
 * @returns {number}
 */
export function compareSeverity(a, b) {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

/**
 * Highest severity present in a list of diagnostics, or null if empty.
 * @param {Diagnostic[]} diagnostics
 * @returns {ErrorSeverity | null}
 */
export function maxSeverity(diagnostics) {
  /** @type {ErrorSeverity | null} */
  let worst = null;
  for (const d of diagnostics) {
    if (worst === null || compareSeverity(d.severity, worst) > 0) worst = d.severity;
  }
  return worst;
}
