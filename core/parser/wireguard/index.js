/**
 * WireGuardParser — public entry point (04-PARSER_ENGINE Stage 09).
 * @module core/parser/wireguard
 */
export { wireguardParser, registerWireguardParser } from "./wireguard-parser.js";
export { detectWireguard } from "./detect.js";
export { parseWireguard, parseIni, itemsFromSections } from "./extract.js";
export { normalizeItem, normalizeManyWireguard, normalizeRefuse, PARSER_NAME } from "./normalize.js";
export { recoverWireguard } from "./recover.js";
