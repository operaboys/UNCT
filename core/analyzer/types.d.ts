/**
 * Analyzer Engine — internal intermediate types (06-ANALYZER_ENGINE §1).
 *
 * These are the shapes Analyzers pass *between themselves* before the final
 * scores land in `AnalysisObject` (05-UNIVERSAL_NODE_MODEL §4). They are NOT
 * UNM fields — `AnalysisObject` stays exactly as frozen in spec 05; this file
 * only types the analyzers' working data. New analyzer intermediates may be
 * added here without an ADR (they are not in the UNM Freeze zone).
 */

/**
 * Output of the Data Completeness Analyzer (§1.0). Reports which
 * Protocol/Security-relevant OPTIONAL fields are present vs absent — a pure
 * "is it filled in" question, never "is the value valid" (that is the
 * Validation Engine's job, spec 04) nor "how good is it" (Security/Reality
 * Analyzer's job). Other analyzers consume `missingFields` instead of
 * re-deriving per-field emptiness checks (§1.0 consumption rule).
 */
export interface CompletenessResult {
  /** Relevant optional fields that are absent/empty, e.g. ["sni", "alpn"]. */
  missingFields: string[];
  /** Relevant optional fields that are present (non-empty). */
  presentOptionalFields: string[];
  /** 0-100: percentage of relevant optional fields that are filled in. */
  completenessScore: number;
}
