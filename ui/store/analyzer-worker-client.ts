/**
 * Real-Worker routing for the Analyzer Screen's analyze step (07-UI_UX_
 * SYSTEM §4.3), reusing the exact pattern ADR-016 established for the
 * Converter Screen's parse step: a real, dedicated Worker
 * (`core/worker/analyzer.worker.js` + `core/worker/worker-manager.js`) by
 * DEFAULT, with a single try/catch around `createWorkerManager` feature-
 * detecting Worker construction and falling back to the main-thread
 * `analyzeBatch` only when constructing a Worker is physically impossible
 * (the `file://` page-origin case ADR-016 benchmarked).
 *
 * `assets/js/analyzer-worker.js` (ADR-016 Addendum, 2026-07-06 — CORRECTION
 * of this file's own former claim): this Worker used to load from its raw
 * `core/worker/analyzer.worker.js` source, on the reasoning that its import
 * graph (the six Phase 6 Core analyzers, plus the Phase 10 Extended ones)
 * has zero BARE npm specifiers, so no `js-yaml`-shaped gap existed for
 * `scripts/build.js` to close. That reasoning was too narrow: a real
 * "Worker error" was reported and reproduced only intermittently, with a
 * SINGLE node (ruling out any data/size cause), across an 18-file relative-
 * import graph a real Worker must fetch and link individually at
 * construction time — the same `Worker.onerror` failure class ADR-016
 * already documented and fixed for the parser/converter Workers, just not
 * triggered by a bare specifier this time. Bundled the same way as those
 * two (`scripts/build.js`), removing the whole class of per-file
 * fetch/resolution failure regardless of which exact file or browser quirk
 * was responsible.
 *
 * Timeout safety-net (2026-07-05, following an unreproduced "Analyze stuck
 * forever" report): `analyzeNodesWith` now races the Job against a 30s
 * timer (`withTimeout`, below) regardless of root cause -- if a Job never
 * settles for any reason, the underlying Job is cancelled (freeing its pool
 * slot) and the caller gets a real `AnalyzeTimeoutError` instead of waiting
 * forever, so `isAnalyzing` in `ui/analyzer/analyzer-screen.tsx` is
 * guaranteed to reset either way.
 */
import { analyzeBatch } from "../../core/analyzer/analyze-node.js";
import { createWorkerManager, CancelledError } from "../../core/worker/worker-manager.js";
import type { UNMNode, Protocol, NetworkType, SecurityType, DnsLeakRisk } from "../../core/types/unm";

export { CancelledError };

const ANALYZER_WORKER_URL = "assets/js/analyzer-worker.js";
const TRACK = "analyzer-screen-analyze";

// Safety-net (doc 10 §6.1 "no Job may hang forever"): even after the
// postMessage-throw guards (core/worker/worker-manager.js,
// core/worker/shared/handler-envelope.js), a Job can in principle still
// never settle -- the Worker thread itself could stall for a reason outside
// this app's control (OS/browser scheduling starvation, a genuinely
// misbehaving browser extension intercepting the Worker, etc.). Regardless
// of root cause, the UI must never wait on the Analyze button forever. 30s
// is generous: `analyzeBatch` alone processes thousands of real nodes in
// well under 100ms (measured directly, see README) -- the Worker
// round-trip overhead never approaches this bound in any working scenario.
// Exported so tests can assert the exact bound with fake timers instead of
// hardcoding a second copy of this number.
export const ANALYZE_TIMEOUT_MS = 30_000;

/** Distinguishable from `CancelledError` so the UI can show a real message
 * for a genuine timeout instead of silently no-op'ing like a superseded Job. */
export class AnalyzeTimeoutError extends Error {
  constructor(message = "Analyze timed out") {
    super(message);
    this.name = "AnalyzeTimeoutError";
  }
}

/**
 * Races `promise` against a timer; on timeout, calls `onTimeout()` (to
 * cancel the underlying Job so its pool slot frees and its late result is
 * discarded as stale, same as any other cancellation) and rejects with
 * `AnalyzeTimeoutError` instead of leaving the caller waiting indefinitely.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      onTimeout();
      reject(new AnalyzeTimeoutError());
    }, ms);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export interface CompletenessResult {
  missingFields: string[];
  presentOptionalFields: string[];
  completenessScore: number;
}

export interface ProtocolAnalysis {
  protocol: Protocol;
  recognized: boolean;
}

export interface NetworkAnalysis {
  network: NetworkType;
  protocol: Protocol;
  compatible: boolean;
  supportedNetworks: NetworkType[];
}

export interface TlsAnalysis {
  securityType: SecurityType;
  applicable: boolean;
  coherent: boolean;
  knownFingerprint: boolean | null;
  issues: string[];
}

export interface RealityAnalysis {
  applicable: boolean;
  compatible: boolean;
  pbkPlausible: boolean | null;
  sidPlausible: boolean | null;
  issues: string[];
}

export interface SecurityAnalysis {
  securityScore: number;
  issues: string[];
}

export type Platform = "android" | "ios" | "windows" | "linux" | "macos";
export type ClientApp = "xray" | "sing-box" | "clash-meta" | "nekobox" | "v2rayng" | "hiddify";

export interface CompatibilityAnalysis {
  platforms: Record<Platform, boolean | null>;
  clients: Record<ClientApp, boolean | null>;
}

export type AnalysisConfidence = "low" | "medium" | "high";

export interface CloudflareAnalysis {
  likelyCloudflareWorker: boolean;
  confidence: AnalysisConfidence;
  signals: string[];
}

export interface CleanIpAnalysis {
  isCleanIpPattern: boolean;
  confidence: AnalysisConfidence;
  signals: string[];
}

export interface WorkerEncodedFinding {
  source: string;
  raw: string;
  decoded: string | null;
  rawBase64Detected: boolean;
}

export interface WorkerAnalysis {
  applicable: boolean;
  workerDomain: string | null;
  pathSegments: string[];
  uuidSegment: string | null;
  parameters: Record<string, string>;
  encodedDataFindings: WorkerEncodedFinding[];
}

export interface RuleAnalysis {
  applicable: boolean;
  totalCount: number;
  byCategory: Record<string, number>;
  duplicateCount: number;
  duplicates: string[];
}

export interface AnalysisBundle {
  completeness: CompletenessResult;
  protocol: ProtocolAnalysis;
  network: NetworkAnalysis;
  tls: TlsAnalysis;
  reality: RealityAnalysis;
  security: SecurityAnalysis;
  compatibility: CompatibilityAnalysis;
  cloudflare: CloudflareAnalysis;
  cleanIp: CleanIpAnalysis;
  worker: WorkerAnalysis;
  rules: RuleAnalysis;
  dns: DnsLeakRisk;
  compatibilityScore: number;
  riskScore: number;
}

export interface AnalyzeResult {
  analyzed: { nodeId: string; analysis: AnalysisBundle }[];
}

type AnalyzerWorkerManager = ReturnType<typeof createWorkerManager>;

/**
 * Pure, dependency-injected feature detection — exported so the fallback
 * decision is unit-testable without a real browser, by passing a fake/
 * throwing/working `WorkerCtor` directly (mirrors `parser-worker-client.ts`'s
 * `createParserWorkerManager`).
 */
export function createAnalyzerWorkerManager(
  WorkerCtor: (new (url: string, opts: { type: "module" }) => unknown) | undefined,
): AnalyzerWorkerManager | null {
  if (typeof WorkerCtor !== "function") return null;
  try {
    return createWorkerManager({
      workerFactory: () => new WorkerCtor(ANALYZER_WORKER_URL, { type: "module" }) as never,
    });
  } catch {
    return null;
  }
}

const workerManager = createAnalyzerWorkerManager(
  typeof Worker === "undefined" ? undefined : Worker,
);

/**
 * The actual analyze-dispatch logic, parameterized over the manager so tests
 * can exercise both branches deterministically — `analyzeNodes` below is a
 * thin wrapper over this with the module's real singleton.
 */
export function analyzeNodesWith(
  manager: AnalyzerWorkerManager | null,
  nodes: readonly Readonly<UNMNode>[],
): Promise<AnalyzeResult> {
  if (!manager) {
    // No real Worker involved -- nothing to hang on postMessage/scheduling,
    // but still routed through the same timeout race for one uniform
    // caller-facing contract (a no-op in practice: this always settles fast).
    return withTimeout(
      Promise.resolve().then(() => analyzeBatch(nodes) as unknown as AnalyzeResult),
      ANALYZE_TIMEOUT_MS,
      () => {},
    );
  }
  const { jobId, promise } = manager.runJob({ nodes }, { track: TRACK });
  // `forceRelease` (not `cancel`): the Job is already in flight by the time a
  // timeout could ever fire, and `cancel()`'s in-flight branch only marks it
  // stale, trusting the Worker's eventual real message to free the slot --
  // `forceRelease` also terminates/replaces that slot's Worker outright, so
  // a genuinely stalled-forever Worker never permanently shrinks the pool.
  return withTimeout(promise as Promise<AnalyzeResult>, ANALYZE_TIMEOUT_MS, () => manager.forceRelease(jobId));
}

export function analyzeNodes(nodes: readonly Readonly<UNMNode>[]): Promise<AnalyzeResult> {
  return analyzeNodesWith(workerManager, nodes);
}

export function getAnalyzerPoolStats() {
  return workerManager ? workerManager.getStats() : null;
}
