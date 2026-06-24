/**
 * Runtime enforcement of the BaseParser Contract (12-PARSER_FACTORY §2).
 * Plain JS has no interfaces, so `ParserFactory.register()` calls this to
 * make the contract a runtime guarantee, not just a type-level promise.
 *
 * @typedef {import("../../types/parser").BaseParser} BaseParser
 */

/** The five methods every parser must implement (12 §2). */
export const REQUIRED_METHODS = Object.freeze([
  "detect", "parse", "validateStructure", "normalize", "recover",
]);

/**
 * @param {Partial<BaseParser> | null | undefined} parser
 * @param {string} name
 * @throws {Error} if `parser` does not satisfy the BaseParser contract
 */
export function assertImplementsBaseParser(parser, name) {
  if (!parser || typeof parser !== "object") {
    throw new Error(`BaseParser contract violation: "${name}" is not an object (PARSE_CONTRACT_VIOLATION)`);
  }
  const candidate = /** @type {Record<string, unknown>} */ (parser);
  for (const method of REQUIRED_METHODS) {
    if (typeof candidate[method] !== "function") {
      throw new Error(`BaseParser contract violation: "${name}" is missing required method "${method}()" (PARSE_CONTRACT_VIOLATION)`);
    }
  }
  if (parser.isAsync !== undefined && typeof parser.isAsync !== "boolean") {
    throw new Error(`BaseParser contract violation: "${name}".isAsync must be a boolean if present (PARSE_CONTRACT_VIOLATION)`);
  }
  if (parser.isAsync === true && typeof parser.parseAsync !== "function") {
    throw new Error(`BaseParser contract violation: "${name}" sets isAsync=true but does not implement parseAsync() (PARSE_CONTRACT_VIOLATION)`);
  }
}
