/**
 * Parser Infrastructure — public entry point (12-PARSER_FACTORY).
 * @module core/parser
 */
export { assertImplementsBaseParser, REQUIRED_METHODS } from "./base/index.js";
export { createParserFactory, parserFactory, UNKNOWN_FORMAT_THRESHOLD, normalizeAll } from "./factory.js";
export { xrayParser, registerXrayParser } from "./xray/index.js";
export { urlParser, registerUrlParser } from "./url/index.js";
export {
  subscriptionParser, registerSubscriptionParser, parseSubscription,
} from "./subscription/index.js";
export { singboxParser, registerSingBoxParser } from "./singbox/index.js";
export {
  resolvePriority, levenshtein, fuzzyKey, fuzzyMatch,
  WIREGUARD_EXTENSION_NS, buildWireguardExtensions, repairJson,
} from "./shared/index.js";
