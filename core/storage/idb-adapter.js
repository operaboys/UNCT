/**
 * Raw IndexedDB adapter — the swappable low-level engine behind the Storage
 * Abstraction Layer (09-DEVELOPMENT_ROADMAP Phase 8; ADR-013).
 *
 * 14-DEPENDENCY_POLICY §4: "Primary: Native IndexedDB · Secondary: Dexie
 * Adapter (optional) · Rule: the app must work without Dexie too." This file
 * IS that primary, dependency-free engine — one object store, keyed by the
 * stored object's own `nodeId` property (no synthetic envelope/wrapper key),
 * so whatever shape the caller hands in is exactly what comes back out
 * (no schema assumptions baked in here).
 *
 * `node-store.js` (the actual public Storage Abstraction Layer) talks to this
 * file ONLY through the small `{get, put, putMany, remove, getAll, clear,
 * count, close}` surface returned below. A future Dexie-backed adapter
 * implementing that same surface could be swapped in without `node-store.js`
 * changing at all — that swappability, not this file itself, is the point of
 * the abstraction (ADR-013).
 */

/**
 * @param {string} dbName
 * @param {string} storeName
 * @param {number} version
 * @returns {Promise<IDBDatabase>}
 */
function openDb(dbName, storeName, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "nodeId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Run one `IDBObjectStore` request inside its own transaction.
 * @param {Promise<IDBDatabase>} dbPromise
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} op
 * @returns {Promise<any>}
 */
function runRequest(dbPromise, storeName, mode, op) {
  return dbPromise.then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = op(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

/**
 * Put every value in ONE transaction (atomic, single round-trip) — IndexedDB
 * has no native `putAll`; this is the idiomatic multi-put-per-transaction
 * substitute.
 * @param {Promise<IDBDatabase>} dbPromise
 * @param {string} storeName
 * @param {readonly unknown[]} values
 * @returns {Promise<void>}
 */
function putAllInOneTransaction(dbPromise, storeName, values) {
  return dbPromise.then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const value of values) store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

/**
 * @param {{ dbName?: string, storeName?: string, version?: number }} [options]
 */
export function createIdbAdapter(options = {}) {
  const dbName = options.dbName ?? "unct-storage";
  const storeName = options.storeName ?? "nodes";
  const version = options.version ?? 1;
  const dbPromise = openDb(dbName, storeName, version);

  return {
    /** @param {string} key */
    get: (key) => runRequest(dbPromise, storeName, "readonly", (store) => store.get(key)),
    /** @param {unknown} value */
    put: (value) => runRequest(dbPromise, storeName, "readwrite", (store) => store.put(value)),
    /** @param {readonly unknown[]} values */
    putMany: (values) => putAllInOneTransaction(dbPromise, storeName, values),
    /** @param {string} key */
    remove: (key) => runRequest(dbPromise, storeName, "readwrite", (store) => store.delete(key)),
    getAll: () => runRequest(dbPromise, storeName, "readonly", (store) => store.getAll()),
    clear: () => runRequest(dbPromise, storeName, "readwrite", (store) => store.clear()),
    count: () => runRequest(dbPromise, storeName, "readonly", (store) => store.count()),
    close: () => dbPromise.then((db) => db.close()),
  };
}
