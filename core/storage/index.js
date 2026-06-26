/**
 * Storage Engine — public entry point (09-DEVELOPMENT_ROADMAP Phase 8;
 * ADR-013). Distinct from `core/store/` (reserved for the Phase 9 Preact
 * reactive UI layer) — see ADR-013.
 * @module core/storage
 */
export { createNodeStore } from "./node-store.js";
export { createIdbAdapter } from "./idb-adapter.js";
