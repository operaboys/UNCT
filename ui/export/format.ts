/**
 * Pure display-string formatting for the Export Center Screen (07-UI_UX_SYSTEM
 * §4.6). `core/exporter/`'s batching functions already attach a per-entry
 * `reason` to every skipped node (`core/exporter/skip-reason.js`) — this
 * groups by that exact reason text (never re-deriving it) so the screen can
 * tell the user WHY, not just which nodes, in one line per distinct cause.
 */

export interface SkippedExportNode {
  nodeId: string;
  protocol: string;
  reason: string;
}

/** `null` when nothing was skipped, so the caller can render nothing instead of an empty hint. */
export function formatSkipped(skipped: readonly SkippedExportNode[]): string | null {
  if (skipped.length === 0) return null;
  const countByReason = new Map<string, number>();
  for (const s of skipped) countByReason.set(s.reason, (countByReason.get(s.reason) ?? 0) + 1);
  return [...countByReason.entries()]
    .map(([reason, count]) => `${reason} (${count} node${count === 1 ? "" : "s"})`)
    .join("; ");
}
