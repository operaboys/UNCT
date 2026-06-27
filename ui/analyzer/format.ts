/**
 * Pure display-string formatting for the Analyzer Screen (07-UI_UX_SYSTEM
 * §4.3) — extracted out of `analyzer-screen.tsx`'s JSX so the formatting
 * RULES are unit-testable on their own, independent of any Preact render
 * cycle (mirrors `ui/converter/format.ts`'s pattern). These functions only
 * format values the six Core analyzers already computed
 * (`core/analyzer/analyze-node.js`) — Rule 11's boundary still holds:
 * nothing here scores or judges anything.
 */

export function formatStringList(items: readonly string[]): string {
  return items.length === 0 ? "none" : items.join(", ");
}

/**
 * Formats a tri-state analyzer verdict (`boolean | null`) where `null`
 * means "not applicable for this node" — distinct from `false`, so it must
 * never collapse to the same display text as "No".
 */
export function formatTriState(value: boolean | null): string {
  if (value === null) return "N/A";
  return value ? "Yes" : "No";
}

export function formatScore(score: number): string {
  return `${score}/100`;
}
