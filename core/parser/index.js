/**
 * Parser Infrastructure — public entry point (12-PARSER_FACTORY).
 * @module core/parser
 */
export { assertImplementsBaseParser, REQUIRED_METHODS } from "./base/index.js";
export { createParserFactory, parserFactory, UNKNOWN_FORMAT_THRESHOLD } from "./factory.js";
