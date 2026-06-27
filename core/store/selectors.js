/**
 * Selectors over `ParserState` — the only sanctioned way UI reads node data
 * (ANTI_CHAOS Rule 11's Selector Pattern boundary). Each selector is a small,
 * pure function returning a ready View Model; none compute a new score or
 * validity here — sorting/filtering on a value already computed by
 * Validation/Analyzer is display, not Core logic, so it is allowed in this
 * boundary layer. Computing a NEW score/validity belongs in
 * `core/validator/`/`core/analyzer/`, never here.
 *
 * Memoizing a selector's result across renders (Render Optimization Rules,
 * spec 13) is the `ui/store/` Preact bridge's job, not this file's — these
 * functions stay plain and framework-agnostic.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("./parser-state").ParserState} ParserState
 */

/**
 * @param {ParserState} state
 * @returns {readonly UNMNode[]}
 */
export function selectAllNodes(state) {
  return state.nodes;
}

/**
 * @param {ParserState} state
 * @param {string} nodeId
 * @returns {UNMNode | undefined}
 */
export function selectNodeById(state, nodeId) {
  return state.nodes.find((n) => n.nodeId === nodeId);
}

/**
 * @param {ParserState} state
 * @returns {readonly string[]}
 */
export function selectValidNodeIds(state) {
  return state.nodes.filter((n) => n.validation.overallValid).map((n) => n.nodeId);
}

/**
 * Sorted by `analysis.securityScore` (Analyzer-computed, ADR-011), highest
 * first. Nodes the Analyzer has not yet scored (`analysis` absent) sort
 * last, not first — an unscored node is not implied to be insecure.
 * @param {ParserState} state
 * @returns {readonly UNMNode[]}
 */
export function selectNodesSortedBySecurity(state) {
  return [...state.nodes].sort((a, b) => {
    const scoreA = a.analysis?.securityScore;
    const scoreB = b.analysis?.securityScore;
    if (scoreA === undefined && scoreB === undefined) return 0;
    if (scoreA === undefined) return 1;
    if (scoreB === undefined) return -1;
    return scoreB - scoreA;
  });
}
