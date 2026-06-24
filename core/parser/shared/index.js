/**
 * Shared parser helpers — reusable across all parsers (Xray, URL, ...).
 * @module core/parser/shared
 */
export { resolvePriority } from "./priority.js";
export { levenshtein, fuzzyKey, fuzzyMatch } from "./fuzzy.js";
