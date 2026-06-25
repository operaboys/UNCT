/**
 * Worker Mock — the Vitest-side stand-in prescribed by ADR-003 / 15-TESTING_
 * FRAMEWORK ("a Worker Mock... that invokes the pure function directly,
 * without simulating a full separate Thread").
 *
 * `createMockWorker(handler)` implements the same surface a real `Worker`
 * exposes (`postMessage`/`addEventListener("message"|"error")`/`terminate`),
 * but instead of crossing a thread boundary it calls `handler` (the exact
 * pure function exported by a `*.worker.js` file, e.g. `handleParserJob`)
 * directly, deferred one microtask so dispatch still returns to the caller
 * before the handler runs — preserving the async ordering real Worker code
 * depends on without paying for a real thread.
 */

/**
 * @param {(message: unknown) => unknown | Promise<unknown>} handler
 */
export function createMockWorker(handler) {
  /** @typedef {(evt: { data?: unknown, message?: string, error?: unknown }) => void} Listener */
  /** @type {{ message: Set<Listener>, error: Set<Listener> }} */
  const listeners = { message: new Set(), error: new Set() };
  let terminated = false;

  return {
    /** @param {unknown} data */
    postMessage(data) {
      if (terminated) return;
      queueMicrotask(() => {
        if (terminated) return;
        Promise.resolve()
          .then(() => handler(data))
          .then((result) => {
            if (terminated) return;
            for (const cb of listeners.message) cb({ data: result });
          })
          .catch((err) => {
            if (terminated) return;
            for (const cb of listeners.error) {
              cb({ message: err instanceof Error ? err.message : String(err), error: err });
            }
          });
      });
    },
    /**
     * @param {"message"|"error"} type
     * @param {Listener} cb
     */
    addEventListener(type, cb) {
      listeners[type].add(cb);
    },
    /**
     * @param {"message"|"error"} type
     * @param {Listener} cb
     */
    removeEventListener(type, cb) {
      listeners[type].delete(cb);
    },
    terminate() {
      terminated = true;
      listeners.message.clear();
      listeners.error.clear();
    },
  };
}

/**
 * @param {(message: unknown) => unknown | Promise<unknown>} handler
 * @returns {() => ReturnType<typeof createMockWorker>}
 */
export function createMockWorkerFactory(handler) {
  return () => createMockWorker(handler);
}
