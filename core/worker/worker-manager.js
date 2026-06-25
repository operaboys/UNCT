/**
 * Worker Manager — generic Pool/dispatch/cancellation layer
 * (10-PERFORMANCE_ENGINE §2/§5/§6). One manager instance = one independent
 * pool for ONE worker kind (Parser/Analyzer/Converter); pools never chain
 * (§2 — "Worker Pools have no hard dependency on each other"). Pure
 * orchestration only — no parsing/analysis/conversion logic lives here
 * (ADR-003 Separation of Concerns); a manager is handed a `workerFactory`
 * that produces whatever worker-like object it should dispatch jobs to.
 *
 * Communication is Message-Based only (§6 — never a Shared Mutable Object):
 * every job is a `postMessage({ jobId, generationId, track, payload })` and
 * every result is a `{ jobId, generationId, track, ok, result|error }`
 * message back. The Versioning/Cancellation mechanism (jobId + generationId
 * + track) is documented and reasoned through in ADR-010 — see that ADR for
 * *why* this shape, this file is the implementation.
 *
 * On SharedArrayBuffer (doc 10 §3): doc 10 mandates SAB *feature detection
 * with a MessageChannel fallback* — but only as a guard for the case where
 * SAB is actually used to move large raw buffers across the thread boundary.
 * This engine never reaches that case: doc 10 §3's companion rule "Flatten
 * Before PostMessage" + the §"Minimal Result" policy mean a worker returns a
 * small, already-projected flat object (see `parser.worker.js#flattenNode`),
 * not a large raw payload. With nothing large to transfer, structured-clone
 * `postMessage` is correct and SAB's zero-copy win (which only pays off for
 * big ArrayBuffers, and additionally demands COOP/COEP cross-origin isolation
 * this zero-build static-file app can't assume) does not apply. So there is
 * deliberately no SAB code path here to feature-detect — the detection rule is
 * satisfied vacuously. If a future worker ever needs to ship a large raw
 * buffer, THAT is where the §3 `typeof SharedArrayBuffer !== "undefined"`
 * check + MessageChannel fallback must be added.
 *
 * @typedef {{ postMessage(data: unknown): void, addEventListener(type: "message"|"error", cb: (evt: { data?: unknown, message?: string }) => void): void, terminate?: () => void }} WorkerLike
 * @typedef {{ jobId: string, generationId: number, track: string, ok: boolean, result?: unknown, error?: { message?: string } }} WorkerResponseMessage
 * @typedef {{ worker: WorkerLike, busy: boolean, currentJobId: string|null }} PoolSlot
 * @typedef {{ jobId: string, track: string, generationId: number, payload: unknown, resolve: (value: unknown) => void, reject: (reason?: unknown) => void, settled: boolean }} Job
 */

/**
 * @param {number} hardwareConcurrency
 * @returns {number}
 */
export function computePoolSize(hardwareConcurrency) {
  const hc = Number.isFinite(hardwareConcurrency) ? hardwareConcurrency : 0;
  return Math.max(2, Math.min(8, hc - 1));
}

const DEFAULT_HARDWARE_CONCURRENCY_FALLBACK = 4;

/** Feature-detected `navigator.hardwareConcurrency` read, with a safe fallback when unavailable. */
export function resolveHardwareConcurrency(fallback = DEFAULT_HARDWARE_CONCURRENCY_FALLBACK) {
  if (typeof navigator !== "undefined" && Number.isFinite(navigator.hardwareConcurrency)) {
    return navigator.hardwareConcurrency;
  }
  return fallback;
}

function generateId() {
  const c = /** @type {Crypto | undefined} */ (globalThis.crypto);
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** A stale/cancelled job's promise rejects with this — never resolves, per doc 10 §6.1 ("Stale Jobs must never update State"). */
export class CancelledError extends Error {
  constructor(message = "Job was cancelled (stale relative to its track)") {
    super(message);
    this.name = "CancelledError";
  }
}

/**
 * @param {{ workerFactory: () => WorkerLike, poolSize?: number }} options
 */
export function createWorkerManager(options) {
  const { workerFactory, poolSize } = options || {};
  if (typeof workerFactory !== "function") {
    throw new Error("createWorkerManager: workerFactory is required (WORKER_CONTRACT_VIOLATION)");
  }
  const size = Math.max(1, typeof poolSize === "number" && Number.isFinite(poolSize) ? poolSize : computePoolSize(resolveHardwareConcurrency()));

  /** @type {PoolSlot[]} */
  const pool = Array.from({ length: size }, () => ({ worker: workerFactory(), busy: false, currentJobId: null }));
  /** @type {Job[]} */
  const queue = [];
  /** @type {Map<string, Job>} */
  const jobs = new Map();
  /** @type {Map<string, number>} track -> current (latest) generationId */
  const generationByTrack = new Map();

  for (const slot of pool) {
    slot.worker.addEventListener("message", (evt) => handleMessage(slot, evt));
    slot.worker.addEventListener("error", (evt) => handleError(slot, evt));
  }

  /**
   * @param {string} track
   * @returns {number}
   */
  function bumpTrackGeneration(track) {
    const next = (generationByTrack.get(track) || 0) + 1;
    generationByTrack.set(track, next);
    return next;
  }

  /**
   * @param {Job} job
   * @returns {boolean}
   */
  function isStale(job) {
    return generationByTrack.get(job.track) !== job.generationId;
  }

  /**
   * @param {Job} job
   * @param {() => void} run
   */
  function settle(job, run) {
    if (job.settled) return;
    job.settled = true;
    jobs.delete(job.jobId);
    run();
  }

  /**
   * @param {{ jobId: string, track: string, generationId: number, payload: unknown, resolve: (value: unknown) => void, reject: (reason?: unknown) => void }} params
   * @returns {Job}
   */
  function makeJob({ jobId, track, generationId, payload, resolve, reject }) {
    return { jobId, track, generationId, payload, resolve, reject, settled: false };
  }

  /**
   * @param {PoolSlot} slot
   * @param {{ data?: unknown, message?: string }} evt
   */
  function handleMessage(slot, evt) {
    slot.busy = false;
    slot.currentJobId = null;
    const msg = /** @type {WorkerResponseMessage | undefined} */ (evt.data);
    const job = msg ? jobs.get(msg.jobId) : undefined;
    if (job) {
      if (isStale(job)) {
        settle(job, () => job.reject(new CancelledError()));
      } else if (msg && msg.ok) {
        settle(job, () => job.resolve(msg.result));
      } else {
        settle(job, () => job.reject(new Error((msg && msg.error && msg.error.message) || "Worker job failed")));
      }
    }
    dispatchNext();
  }

  /**
   * @param {PoolSlot} slot
   * @param {{ data?: unknown, message?: string }} evt
   */
  function handleError(slot, evt) {
    // A raw, uncaught exception on the worker (bypassing the standard
    // {ok:false, error} envelope — e.g. a handler that throws synchronously
    // instead of rejecting) still belongs to whichever job that slot was
    // running, so it must reject that job rather than leave it hanging
    // forever. Beyond that: no Worker-restart policy in this phase (out of
    // scope — doc 15's "Worker Restart Cycles" is a future memory-leak test
    // concern, not a Phase 5 deliverable) — the slot is simply freed.
    slot.busy = false;
    const job = slot.currentJobId ? jobs.get(slot.currentJobId) : undefined;
    slot.currentJobId = null;
    if (job) {
      const message = (evt && evt.message) || "Worker error";
      settle(job, () => job.reject(isStale(job) ? new CancelledError() : new Error(message)));
    }
    dispatchNext();
  }

  function dispatchNext() {
    if (queue.length === 0) return;
    const idle = pool.find((s) => !s.busy);
    if (!idle) return;
    const job = queue.shift();
    if (!job) return;
    if (isStale(job)) {
      settle(job, () => job.reject(new CancelledError()));
      dispatchNext();
      return;
    }
    idle.busy = true;
    idle.currentJobId = job.jobId;
    idle.worker.postMessage({
      jobId: job.jobId, generationId: job.generationId, track: job.track, payload: job.payload,
    });
  }

  /**
   * Dispatch one job. `track` groups jobs that supersede each other (doc 10
   * §6.1's `Import A -> Import B -> A Cancelled -> B Continues`): starting a
   * new job on a track already in flight immediately invalidates the
   * previous one. Jobs with no `track` are their own track (independently
   * cancellable, never auto-superseded by anything else).
   *
   * @param {unknown} payload
   * @param {{ track?: string, signal?: AbortSignal }} [opts]
   * @returns {{ jobId: string, promise: Promise<unknown>, cancel: () => void }}
   */
  function runJob(payload, opts) {
    const { track, signal } = opts || {};
    const jobId = generateId();
    const effectiveTrack = track || jobId;
    const generationId = bumpTrackGeneration(effectiveTrack);

    // Auto-supersede: any job still queued (not yet dispatched) on the same
    // track is now stale — reject it immediately rather than letting it
    // waste a worker slot. An already in-flight job on this track needs no
    // action here: its generationId no longer matches, so handleMessage()
    // will discard its result as stale when it eventually arrives.
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (queue[i].track === effectiveTrack) {
        const stale = queue[i];
        queue.splice(i, 1);
        settle(stale, () => stale.reject(new CancelledError()));
      }
    }

    /** @type {(value: unknown) => void} */
    let resolve = () => {};
    /** @type {(reason?: unknown) => void} */
    let reject = () => {};
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const job = makeJob({ jobId, track: effectiveTrack, generationId, payload, resolve, reject });
    jobs.set(jobId, job);
    queue.push(job);

    function cancel() {
      if (job.settled) return;
      if (!isStale(job)) bumpTrackGeneration(job.track);
      const idx = queue.indexOf(job);
      if (idx !== -1) {
        queue.splice(idx, 1);
        settle(job, () => job.reject(new CancelledError()));
      }
      // else: already in flight — its result is discarded as stale on arrival.
    }

    if (signal) {
      if (signal.aborted) cancel();
      else signal.addEventListener("abort", cancel, { once: true });
    }

    dispatchNext();
    return { jobId, promise, cancel };
  }

  function terminate() {
    for (const slot of pool) {
      if (typeof slot.worker.terminate === "function") slot.worker.terminate();
    }
  }

  return {
    runJob,
    terminate,
    get poolSize() { return size; },
    get pendingCount() { return queue.length; },
  };
}
