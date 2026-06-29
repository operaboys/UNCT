/**
 * Pure node-list shaping for the Subscription Center Screen (07-UI_UX_SYSTEM
 * §4.4) — extracted out of `subscription-screen.tsx`'s JSX so the Security
 * Score sort/format logic (Orphan Check item #2: wiring up the previously
 * never-called `selectNodesSortedBySecurity`) is unit-testable on its own,
 * independent of any Preact render cycle (mirrors `ui/dashboard/format.ts`'s
 * pattern). `AnalysisByNodeId`'s import is type-only (erased at build time,
 * zero runtime Preact dependency) — it only borrows the hook's return shape.
 */
import { selectAnalysisByNodeId, selectNodesSortedBySecurity } from "../../core/store/selectors.js";
import { formatScore } from "../analyzer/format.js";
import type { useAnalyzerState } from "../store/use-analyzer-state.js";
import type { UNMNode } from "../../core/types/unm";

type AnalysisByNodeId = ReturnType<typeof useAnalyzerState>;

/**
 * `selectNodesSortedBySecurity` (core/store/selectors.js) only ever reads
 * `node.analysis?.securityScore` — a field the real Analyzer pipeline never
 * populates (the genuine per-node verdict lives in the separate
 * `AnalyzerState` map instead, see `core/store/analyzer-state.js`). This
 * splices just that one read field onto a shallow copy of each node, sourced
 * from the real `AnalyzerState` bundle, then defers to the existing,
 * unmodified selector for the actual ordering — presentation-layer joining
 * of two already-real sources, not a new score (Rule 9).
 */
export function sortNodesBySecurityScore(
  nodes: readonly UNMNode[],
  analysisByNodeId: AnalysisByNodeId,
): readonly UNMNode[] {
  const withScore = nodes.map((n) => {
    const bundle = selectAnalysisByNodeId({ analysisByNodeId }, n.nodeId);
    return bundle ? { ...n, analysis: { securityScore: bundle.security.securityScore } } : n;
  });
  return selectNodesSortedBySecurity({ nodes: withScore } as Parameters<typeof selectNodesSortedBySecurity>[0]);
}

/** A node the Analyzer has not scored yet renders "N/A", never a fabricated 0 (Rule 9). */
export function formatNodeSecurityScore(analysisByNodeId: AnalysisByNodeId, nodeId: string): string {
  const bundle = selectAnalysisByNodeId({ analysisByNodeId }, nodeId);
  return bundle ? formatScore(bundle.security.securityScore) : "N/A";
}
