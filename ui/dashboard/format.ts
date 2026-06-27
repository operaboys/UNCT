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
