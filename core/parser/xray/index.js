/**
 * XrayParser — public entry point (04-PARSER_ENGINE Stage 04).
 * @module core/parser/xray
 */
export { xrayParser, registerXrayParser } from "./xray-parser.js";
export { detectXray } from "./detect.js";
export {
  parseXray, selectOutbound, collectOutbounds, extractOutbound,
  extractItemsFromOutbound, PROXY_PROTOCOLS,
} from "./extract.js";
export {
  normalizeItem, normalizeManyXray, normalizeRefuse, resolvePriority,
  PRIORITY_CHAINS, PARSER_NAME,
} from "./normalize.js";
export { recoverXray, repairJson, fuzzyKey, levenshtein } from "./recover.js";
