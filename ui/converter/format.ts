/**
 * Pure display-string formatting for the Converter Screen (07-UI_UX_SYSTEM
 * §4.2) — extracted out of `converter-screen.tsx`'s JSX so the formatting
 * RULES (how a count map / diagnostic list / skipped list become display
 * text) are unit-testable on their own, independent of any Preact render
 * cycle. These functions only format values Core already computed
 * (`core/store/selectors.js`, `core/converter/conversion.js`) — Rule 11's
 * boundary still holds: nothing here scores, validates, or converts.
 */

/** @param {Record<string, number>} counts */
export function formatProtocolCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "—";
  return entries.map(([protocol, count]) => `${protocol}: ${count}`).join(", ");
}

export function formatDiagnosticList(items: readonly string[]): string {
  return items.length === 0 ? "none" : items.join("; ");
}

export interface SkippedNode {
  protocol: string;
}

/** `null` when nothing was skipped, so the caller can render nothing instead of an empty hint. */
export function formatSkippedProtocols(skipped: readonly SkippedNode[]): string | null {
  if (skipped.length === 0) return null;
  const protocols = skipped.map((s) => s.protocol).join(", ");
  return `Skipped (${skipped.length}, protocol not supported by this format): ${protocols}`;
}
