/**
 * SingBoxParser — public entry point (04-PARSER_ENGINE Stage 05).
 * @module core/parser/singbox
 */
export { singboxParser, registerSingBoxParser } from "./singbox-parser.js";
export { detectSingBox } from "./detect.js";
export { parseSingBox, collectItems, extractItem, SINGBOX_PROXY_TYPES } from "./extract.js";
export {
  normalizeItem, normalizeManySingBox, normalizeRefuse, PRIORITY_CHAINS, PARSER_NAME,
} from "./normalize.js";
export { recoverSingBox } from "./recover.js";
