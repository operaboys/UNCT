/**
 * ClashParser — public entry point (04-PARSER_ENGINE Stage 06).
 * @module core/parser/clash
 */
export { clashParser, registerClashParser } from "./clash-parser.js";
export { detectClash } from "./detect.js";
export { loadClashYaml } from "./decode.js";
export { parseClash, collectProxies, extractProxy, CLASH_PROXY_TYPES } from "./extract.js";
export {
  normalizeItem, normalizeManyClash, normalizeRefuse, PRIORITY_CHAINS, PARSER_NAME,
} from "./normalize.js";
export { recoverClash } from "./recover.js";
