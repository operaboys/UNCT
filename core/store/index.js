/**
 * Adapter Layer — public entry point (ANTI_CHAOS Rule 11, ADR-015).
 * Framework-agnostic in-memory state + Selectors; zero Preact import.
 * @module core/store
 */
export { createStore } from "./create-store.js";
export { createParserStore } from "./parser-state.js";
export {
  selectAllNodes,
  selectNodeById,
  selectValidNodeIds,
  selectNodesSortedBySecurity,
} from "./selectors.js";
