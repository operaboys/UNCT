/**
 * Shared JSON repair — 04-PARSER_ENGINE Stage 10 (Error Recovery).
 *
 * Structure/syntax only — repairs that never touch values: strips comments and
 * trailing commas, the two breakages real-world exported JSON configs carry.
 * Used by every JSON-based parser's recover() (Xray, Sing-box).
 */

/**
 * @param {string} text
 * @returns {{ text: string, actions: string[] }}
 */
export function repairJson(text) {
  /** @type {string[]} */
  const actions = [];
  let s = typeof text === "string" ? text : "";

  const noBlock = s.replace(/\/\*[\s\S]*?\*\//g, "");
  if (noBlock !== s) { actions.push("REC_STRUCTURE_REPAIRED: removed block comments"); s = noBlock; }

  const noLine = s.replace(/(^|[^:"])\/\/[^\n\r]*/g, "$1");
  if (noLine !== s) { actions.push("REC_STRUCTURE_REPAIRED: removed line comments"); s = noLine; }

  const noTrailing = s.replace(/,(\s*[}\]])/g, "$1");
  if (noTrailing !== s) { actions.push("REC_STRUCTURE_REPAIRED: removed trailing commas"); s = noTrailing; }

  return { text: s, actions };
}

/**
 * Repair (above) then parse. The repair+parse+give-up-on-failure sequence is
 * identical across every JSON-based parser's recover(); this is the one
 * shared entry point instead of each recover.js re-implementing the
 * try/catch around `JSON.parse`.
 * @param {unknown} input
 * @returns {{ config: any, actions: string[] } | null} null if input is not a
 *   non-empty string, or could not be repaired into valid JSON.
 */
export function repairAndParseJson(input) {
  if (typeof input !== "string" || input.trim().length === 0) return null;
  const { text, actions } = repairJson(input);
  try {
    return { config: JSON.parse(text), actions };
  } catch {
    return null;
  }
}
