/**
 * Template Store — persistence for the Template Builder (P12-8, doc 03 §6).
 *
 * Design note (see the Phase 12 checkpoint report for the full write-up):
 * a "Template" is NOT a new data shape. It is structurally an ordinary
 * `UNMNode` — same fields, same Immutability (Rule 8), `remark` already
 * doubles as its human-readable name. The only real difference is intent:
 * a Template is a node explicitly saved into a curated, cross-session
 * library, separate from the Converter's current working set
 * (`core/store/parser-state.js`'s `nodes`), which gets wholesale-replaced by
 * every new Parse. Inventing a placeholder/materialization field or a
 * separate schema for "template fields" would be speculative complexity
 * with no real spec behind it (Rule: don't design for hypothetical
 * requirements) — so none was built.
 *
 * Because a Template IS a UNMNode, its storage contract is byte-identical to
 * `node-store.js`'s (upsert-by-nodeId, get, getAll, delete, count) — so this
 * file does not reimplement `core/storage/idb-adapter.js`'s engine. It is a
 * thin, differently-named wrapper around the exact same `createNodeStore`
 * factory, pointed at its own IndexedDB database (default `unct-templates`,
 * store `templates`) so a user can clear their current working set without
 * losing saved templates, and vice versa.
 */
import { createNodeStore } from "./node-store.js";

const DEFAULT_DB_NAME = "unct-templates";
const DEFAULT_STORE_NAME = "templates";

/**
 * @param {{ dbName?: string, storeName?: string, version?: number }} [options]
 * @returns {ReturnType<typeof createNodeStore>}
 */
export function createTemplateStore(options = {}) {
  return createNodeStore({
    dbName: options.dbName ?? DEFAULT_DB_NAME,
    storeName: options.storeName ?? DEFAULT_STORE_NAME,
    version: options.version,
  });
}
