/**
 * Subscription Analyzer — 06-ANALYZER_ENGINE §2.5, the second نیمه‌قطعی
 * (Extended) module (09-DEVELOPMENT_ROADMAP Phase 10), picked second for
 * being the next-lowest-risk module in §2 after Compatibility (§2.6): pure
 * counting/grouping over already-computed fields, never new multi-layer
 * decoding like the Cloudflare/Worker/Clean-IP modules (§2.1-§2.3).
 *
 * Unlike every other analyzer in this engine (the six §1 Core modules plus
 * Compatibility §2.6), this one is NOT a per-node verdict. §2.5's own text:
 * "این مورد به مجموعه‌ای از Nodeها (نه یک Node تنها) عمل می‌کند" — it consumes
 * a whole `UNMNode[]` (the imported/parsed collection) and produces ONE
 * aggregate summary, never a per-node entry. `analyze-node.js`/
 * `AnalysisBundle` are therefore untouched by this module; it is exposed to
 * the UI through `core/store/selectors.js#selectSubscriptionSummary` instead.
 *
 * Six metrics, §2.5's exact list:
 *  - Total Nodes: `nodes.length`.
 *  - Protocol Distribution: count per `node.protocol`.
 *  - Duplicate Nodes: see `duplicateKey` below for the criterion and its
 *    justification.
 *  - Invalid Nodes: read from each node's OWN existing
 *    `node.validation.overallValid` (already computed by the Validation
 *    Engine, spec 04 Stage 13) — this module deliberately does not re-judge
 *    validity, only lists the nodes the Validation Engine already flagged.
 *  - Dead Nodes Candidate: always `null`. No field anywhere on `UNMNode` or
 *    its metadata records a last-successful-connection time, a live probe
 *    result, or any other liveness signal, so there is nothing to compute
 *    "candidate" from. Per Rule 9 (never fabricate), this module reports
 *    `null` ("نامشخص") rather than guessing — mirroring the Compatibility
 *    Analyzer's own null-for-unknown pattern (§2.6). It is deliberately a
 *    single `null` for the WHOLE metric, not an empty array: an empty array
 *    would claim "checked, found zero dead nodes", which has never actually
 *    been checked.
 *  - Security Ranking: built from `analysisByNodeId` (the Analyzer Screen's
 *    per-node `AnalysisBundle` map, `core/store/analyzer-state.js`) — the
 *    only place a real `securityScore` exists today (the frozen spec-05
 *    `node.analysis.securityScore` field is never actually populated by the
 *    real pipeline). Nodes with no entry in `analysisByNodeId` (not yet
 *    Analyzed) are OMITTED from the ranking entirely, never defaulted to a
 *    score of 0 (Rule 9) — an un-Analyzed node has no security verdict yet,
 *    a different fact than "the worst possible score".
 *
 * Pure & Sync, mirroring every other analyzer in this engine. `core/` must
 * never depend on `core/store/` (ANTI_CHAOS architecture rule), so this
 * module recomputes protocol counts locally rather than importing
 * `selectProtocolCounts` — the dependency only flows Store -> Core.
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../analyze-node.js").AnalysisBundle} AnalysisBundle
 * @typedef {import("../types").DuplicateGroup} DuplicateGroup
 * @typedef {import("../types").SecurityRankEntry} SecurityRankEntry
 * @typedef {import("../types").SubscriptionSummary} SubscriptionSummary
 */

/**
 * Duplicate-detection identity key: protocol + address + port + the
 * protocol's own credential (`uuid` for vless/vmess, `password` for
 * trojan/shadowsocks/hysteria2/tuic). Justification: the same protocol, same
 * server, same port, AND the same secret credential is — for every protocol
 * UNM supports — overwhelmingly the signature of the SAME underlying
 * account/config listed twice (e.g. re-exported into a subscription under
 * two different remarks), not a coincidence two distinct accounts would
 * share. `remark`/node label is deliberately EXCLUDED from the key: a
 * legitimate resubscribe or multi-source merge often relabels the identical
 * node, and treating differing labels as "different nodes" would silently
 * hide real duplicates — the opposite of this metric's purpose.
 *
 * `UNMNode` carries no WireGuard-specific credential field (its real keys,
 * `privateKey`/`peerPublicKey`, are not captured on UNM today), so a
 * WireGuard node's credential component always falls back to `""` — two
 * WireGuard nodes to the same address:port are still flagged duplicate by
 * protocol+address+port alone. This is a known, accepted limitation, not a
 * new validation feature to build here.
 * @param {UNMNode} node
 * @returns {string}
 */
function duplicateKey(node) {
  return `${node.protocol}|${node.address}|${node.port}|${node.uuid ?? node.password ?? ""}`;
}

/**
 * Run the Subscription Analyzer on a whole node collection.
 * @param {readonly UNMNode[]} nodes
 * @param {Readonly<Record<string, AnalysisBundle>>} [analysisByNodeId]
 * @returns {SubscriptionSummary}
 */
export function analyzeSubscription(nodes, analysisByNodeId = {}) {
  /** @type {Record<string, number>} */
  const protocolDistribution = {};
  for (const n of nodes) {
    protocolDistribution[n.protocol] = (protocolDistribution[n.protocol] || 0) + 1;
  }

  /** @type {Map<string, string[]>} */
  const groupsByKey = new Map();
  for (const n of nodes) {
    const key = duplicateKey(n);
    const group = groupsByKey.get(key);
    if (group) group.push(n.nodeId);
    else groupsByKey.set(key, [n.nodeId]);
  }
  /** @type {DuplicateGroup[]} */
  const duplicateGroups = [];
  let duplicateNodeCount = 0;
  for (const [key, nodeIds] of groupsByKey) {
    if (nodeIds.length > 1) {
      duplicateGroups.push({ key, nodeIds });
      duplicateNodeCount += nodeIds.length;
    }
  }

  const invalidNodeIds = nodes.filter((n) => !n.validation.overallValid).map((n) => n.nodeId);

  /** @type {SecurityRankEntry[]} */
  const securityRanking = [];
  for (const n of nodes) {
    const bundle = analysisByNodeId[n.nodeId];
    if (bundle) securityRanking.push({ nodeId: n.nodeId, securityScore: bundle.security.securityScore });
  }
  securityRanking.sort((a, b) => b.securityScore - a.securityScore);

  return {
    totalNodes: nodes.length,
    protocolDistribution,
    duplicateGroups,
    duplicateNodeCount,
    invalidNodeIds,
    deadNodesCandidate: null,
    securityRanking,
  };
}
