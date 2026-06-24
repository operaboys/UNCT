/**
 * Shared JSON repair — 04-PARSER_ENGINE Stage 10 (Error Recovery).
 *
 * Structure/syntax only — repairs that never touch values: strips comments and
 * trailing commas, the two breakages real-world exported JSON configs carry.
 * Used by JSON-based parsers (Sing-box now; Xray has its own equivalent copy
 * predating this module — a future dedup may route Xray here too).
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
