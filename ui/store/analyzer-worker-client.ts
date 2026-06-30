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
 * Unlike `parser-worker-client.ts`, this Worker is loaded from its raw
 * `core/worker/analyzer.worker.js` source, NOT a `scripts/build.js`-bundled
 * artifact: `core/worker/analyzer.worker.js`'s whole import graph (the six
 * Phase 6 Core analyzers) has zero bare npm specifiers — confirmed by grep
 * before relying on it, and re-confirmed against a real browser (the exact
 * lesson ADR-016 Decision point 6 learned: a static "no bare imports" check
 * alone is not proof a real Worker's module loader can resolve everything,
 * only a real browser load is). There is therefore no `js-yaml`-shaped gap
 * here for `scripts/build.js` to close, so no second bundle target was added
 * for this Worker.
 */
import { analyzeBatch } from "../../core/analyzer/analyze-node.js";
import { createWorkerManager, CancelledError } from "../../core/worker/worker-manager.js";
import type { UNMNode, Protocol, NetworkType, SecurityType } from "../../core/types/unm";

export { CancelledError };

const ANALYZER_WORKER_URL = "core/worker/analyzer.worker.js";
const TRACK = "analyzer-screen-analyze";

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
    return Promise.resolve().then(() => analyzeBatch(nodes) as unknown as AnalyzeResult);
  }
  const { promise } = manager.runJob({ nodes }, { track: TRACK });
  return promise as Promise<AnalyzeResult>;
}

export function analyzeNodes(nodes: readonly Readonly<UNMNode>[]): Promise<AnalyzeResult> {
  return analyzeNodesWith(workerManager, nodes);
}
