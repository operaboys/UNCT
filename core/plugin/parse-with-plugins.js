/**
 * Plugin Parser fallback tier — tried only after the six core parsers
 * (`ParserFactory`) have already failed or scored below the confidence
 * threshold. Mirrors `ParserFactory.parseWithFallback`'s Highest-Confidence-
 * Wins + one parse-then-recover attempt per candidate (12-PARSER_FACTORY
 * §4-5), but runs it over `PluginRegistry`-loaded parsers instead of the
 * frozen six-parser core chain.
 *
 * This is a distinct, additive fallback tier, not a change to the core
 * chain itself (Extension Rule, doc 12 §6): `core/parser/factory.js` and
 * `ParserFactory.parseWithFallback` are completely untouched by this file
 * and by the Custom Parser plugins that use it — a plugin is never added to
 * `registerXrayParser`/etc.'s six-parser registry, only to a separate
 * `PluginRegistry` this function reads from.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../types/parser").ParseError} ParseError
 */
import { normalizeAll, UNKNOWN_FORMAT_THRESHOLD } from "../parser/factory.js";
import { applyValidation } from "../validator/apply-validation.js";

/**
 * @param {string} raw
 * @param {ReturnType<typeof import("./registry").createPluginRegistry>} registry
 * @returns {{ parserName: string, recovered: boolean, nodes: Readonly<UNMNode>[] } | null}
 *   `null` when no registered plugin parser reaches the confidence
 *   threshold, or every candidate's parse+recover attempt fails — the
 *   caller falls back to its own "Unknown Format" error in that case.
 */
export function parseWithPlugins(raw, registry) {
  const candidates = registry.listParsers()
    .map((id) => {
      const parser = registry.getParser(id);
      return { id, parser, confidence: parser.detect(raw) };
    })
    .filter((c) => c.confidence >= UNKNOWN_FORMAT_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence);

  for (const { id, parser } of candidates) {
    try {
      const extraction = parser.parse(raw);
      const nodes = normalizeAll(parser, extraction).map(applyValidation);
      return { parserName: id, recovered: false, nodes };
    } catch (err) {
      /** @type {ParseError} */
      const parseError = { message: err instanceof Error ? err.message : String(err), stage: "extract", cause: err };
      const recoveredExtraction = parser.recover(raw, parseError);
      if (recoveredExtraction) {
        const nodes = normalizeAll(parser, recoveredExtraction).map(applyValidation);
        return { parserName: id, recovered: true, nodes };
      }
    }
  }
  return null;
}
