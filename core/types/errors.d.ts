/**
 * Error Code Registry — type contract.
 *
 * Phase 1 deliverable (09-DEVELOPMENT_ROADMAP §Phase 1). Severity ladder per
 * 04-PARSER_ENGINE Stage 13: INFO -> WARNING -> ERROR -> CRITICAL.
 *
 * Codes are namespaced by producing layer so that a code alone tells you where
 * it came from:
 *   PRE  = Preprocessor (Stage 01)
 *   DET  = Format Detector (Stage 02)
 *   PARSE = Field extraction / parsing (Stages 04-09)
 *   REC  = Error / Fuzzy Recovery (Stages 10-11)
 *   VAL  = Validation Engine (Stage 13)
 *   UNM  = Node construction invariants (05-UNIVERSAL_NODE_MODEL)
 */

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type ErrorLayer = "PRE" | "DET" | "PARSE" | "REC" | "VAL" | "UNM";

/** A single registered error code definition. */
export interface ErrorCodeDef {
  code: string;                 // e.g. "VAL_PORT_OUT_OF_RANGE"
  layer: ErrorLayer;
  severity: ErrorSeverity;
  /** Human-readable message template. `{field}`-style placeholders allowed. */
  message: string;
}

/**
 * A diagnostic produced at runtime: a registered code plus the concrete
 * context for this occurrence.
 */
export interface Diagnostic {
  code: string;
  layer: ErrorLayer;
  severity: ErrorSeverity;
  message: string;              // resolved message (placeholders filled)
  field?: string;               // UNM field this diagnostic relates to, if any
  detail?: string;              // extra free-form context
}
