/**
 * Attaches a human-readable `reason` to each Batch Conversion `skipped` entry
 * (`convertBatch`, ADR-012, only returns `{nodeId, protocol}`). The Export
 * Center Screen (07-UI_UX_SYSTEM §4.6) must explain to the user WHY a node
 * was left out of an export, not just which node — so every batching
 * exporter in this directory runs its `skipped` array through this before
 * returning it.
 */

/**
 * @param {{nodeId: string, protocol: string}[]} skipped
 * @param {string} formatLabel
 * @returns {{nodeId: string, protocol: string, reason: string}[]}
 */
export function withSkipReason(skipped, formatLabel) {
  return skipped.map((s) => ({ ...s, reason: `protocol "${s.protocol}" is not supported by ${formatLabel} export` }));
}
