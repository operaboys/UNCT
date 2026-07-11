/**
 * Subscription Visualizer (P12-11) — pure bar-chart computation for the
 * Subscription Center's existing Protocol Distribution table
 * (`core/store/selectors.js#selectSubscriptionSummary`'s `protocolDistribution`,
 * Phase 10). No chart library: doc 03 §6's Visualization group (five backlog
 * items) was reviewed in full and only this one had real, chart-worthy data —
 * a handful of categorical counts across the whole node collection — so a
 * ~10-line pure function computing bar widths, rendered as plain `<div>`
 * width percentages (no `<svg>`, matching `ui/export/qr-render.ts`'s existing
 * hand-rolled-markup precedent), is the entire "visualization." See the P12-11
 * write-up (ULTIMATE_BLUEPRINT_INDEX) for why the other four items were
 * removed rather than built.
 */

export interface ProtocolBar {
  protocol: string;
  count: number;
  /** 0-100, relative to the largest count in the distribution. */
  percent: number;
}

/**
 * Turns `SubscriptionSummary.protocolDistribution` into bars, sorted highest-
 * count-first, each width normalized against the largest count (not the
 * total) so the single biggest bar always reaches 100%.
 */
export function buildProtocolBars(distribution: Record<string, number>): ProtocolBar[] {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, count]) => count));
  return entries
    .map(([protocol, count]) => ({ protocol, count, percent: max === 0 ? 0 : Math.round((count / max) * 100) }))
    .sort((a, b) => b.count - a.count);
}
