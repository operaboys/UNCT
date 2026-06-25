/**
 * Shared parser helpers — reusable across all parsers (Xray, URL, ...).
 * @module core/parser/shared
 */
export { resolvePriority } from "./priority.js";
export { levenshtein, fuzzyKey, fuzzyMatch } from "./fuzzy.js";
export { WIREGUARD_EXTENSION_NS, buildWireguardExtensions } from "./wireguard.js";
export { repairJson } from "./json.js";
export { splitHostPort } from "./endpoint.js";
