/**
 * Pure display-string formatting for the Dashboard Screen (07-UI_UX_SYSTEM
 * §4.1) — extracted out of `dashboard-screen.tsx`'s JSX so the formatting
 * RULE is unit-testable on its own, independent of any Preact render cycle
 * (mirrors `ui/converter/format.ts`/`ui/analyzer/format.ts`'s pattern).
 */
/**
 * `null` (no node analyzed yet, `core/store/selectors.js#selectAverageSecurityScore`)
 * must render as "N/A", never as if it were a real score of 0 (Rule 9).
 */
export function formatAverageScore(score: number | null): string {
  if (score === null) return "N/A";
  return `${Math.round(score)}/100`;
}

// Re-exported for backward compatibility: these maps now live in
// `ui/components/protocol-labels.ts` (shared with Converter and future
// screens) rather than duplicated per screen.
export { PROTOCOL_ABBREVIATION, PROTOCOL_DISPLAY_NAME, SECURITY_TYPE_DISPLAY_NAME } from "../components/protocol-labels.js";

/**
 * A simple two-tier presentational tint for a per-node score badge (Dashboard
 * reference mockup's `.node-score.high`/`.node-score.mid`) — a display-only
 * threshold for legibility (Rule 11's boundary: coloring an already-computed
 * value, not a new judgment), not a fabricated quality tier stored anywhere.
 * No "low" tier exists because the approved reference never showed one;
 * anything below the threshold uses the same "mid" (amber) styling.
 */
export function securityBadgeTier(score: number): "high" | "mid" {
  return score >= 70 ? "high" : "mid";
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * A coarse "N unit ago" string from a real ISO timestamp (`UNMNode.createdAt`)
 * — real elapsed time, never a fabricated/static string. `now` is injectable
 * for deterministic unit tests.
 */
export function formatRelativeTime(isoTimestamp: string, now: number = Date.now()): string {
  const elapsed = now - new Date(isoTimestamp).getTime();
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  return `${Math.floor(elapsed / DAY_MS)}d ago`;
}

export interface ProtocolShareBar {
  protocol: string;
  count: number;
  /** 0-100, percent OF THE TOTAL node count — NOT percent-of-max like
   * `ui/subscription/chart.ts#buildProtocolBars`. This is a deliberately
   * different chart semantic for a deliberately different question ("what
   * share of the whole library is this protocol?" here, vs. "how does this
   * protocol's count compare to the single largest?" in Subscription
   * Center) — not the same logic duplicated under a new name. */
  percent: number;
}

/** Turns `selectProtocolCounts`'s distribution into share-of-total bars, highest-first. */
export function buildProtocolShareBars(distribution: Record<string, number>): ProtocolShareBar[] {
  const entries = Object.entries(distribution);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return [];
  return entries
    .map(([protocol, count]) => ({ protocol, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}
