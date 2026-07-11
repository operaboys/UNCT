/**
 * Wipe All App Data (ADR-030 Decision 4) — the Settings screen's destructive
 * "Wipe Data" action. Clears both storage engines the app actually uses:
 * `createLocalAdapter()`'s default (`"unct:"`-prefixed) LocalStorage keys,
 * which every domain store (settings, node tags, recent exports) already
 * shares, and both IndexedDB databases (`"unct-storage"` — node-store.js's
 * default `dbName`, and `"unct-templates"` — template-store.js's
 * `DEFAULT_DB_NAME`). Deleting the whole database rather than clearing each
 * store is deliberate: it also removes the databases' own version/schema
 * bookkeeping, so a later `createNodeStore()`/`createTemplateStore()` call
 * just recreates them fresh via their own `onupgradeneeded`.
 */
import { createLocalAdapter } from "./local-adapter.js";

const INDEXEDDB_DATABASE_NAMES = ["unct-storage", "unct-templates"];

/**
 * @param {string} name
 * @returns {Promise<void>}
 */
function deleteIndexedDbDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    // A stale open connection (e.g. another tab) blocks deletion indefinitely
    // otherwise — resolve anyway rather than hang the caller forever.
    request.onblocked = () => resolve();
  });
}

/** @returns {Promise<void>} */
export async function wipeAllAppData() {
  createLocalAdapter().clear();
  await Promise.all(INDEXEDDB_DATABASE_NAMES.map(deleteIndexedDbDatabase));
}
