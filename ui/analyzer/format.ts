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

/**
 * Formats a tri-state Compatibility Analyzer verdict (06-ANALYZER_ENGINE
 * §2.6) as a badge glyph. `null` ("نامشخص") means no confident data exists
 * for that platform/client combination — it must render as its own distinct
 * glyph, never collapsed onto the "No" glyph (Rule 9).
 */
export function formatBadge(value: boolean | null): string {
  if (value === null) return "❓";
  return value ? "✅" : "❌";
}

/**
 * Maps a `DnsLeakRisk` (ADR-022) to one of the five existing `.tag--*`
 * severity classes (`assets/css/theme.css`) — the same increasing-severity
 * ramp Developer Console already uses for INFO < WARNING < ERROR < CRITICAL,
 * with `valid` (green) added on the safe end for "none" and `info` (neutral
 * grey) reused for "unknown" (absence of data is not itself a risk level,
 * Rule 9). No new CSS class is introduced.
 */
const DNS_RISK_TAG_CLASS: Record<string, string> = {
  none: "tag--valid",
  low: "tag--warning",
  medium: "tag--invalid",
  high: "tag--critical",
  unknown: "tag--info",
};

export function dnsRiskTagClass(risk: string): string {
  return DNS_RISK_TAG_CLASS[risk] ?? "tag--info";
}
