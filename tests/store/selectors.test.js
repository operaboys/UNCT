/**
 * Selectors over ParserState (core/store/selectors.js, ADR-015) — the
 * Rule 11 boundary: sorting/filtering on values Validation/Analyzer already
 * computed is allowed here; computing a NEW score is not (and none of these
 * selectors do).
 */
import { describe, it, expect } from "vitest";
import { createNode, withValidation } from "../../core/unm/create-node.js";
import {
  selectAllNodes,
  selectNodeById,
  selectValidNodeIds,
  selectNodesSortedBySecurity,
  selectProtocolCounts,
  selectAggregatedWarnings,
  selectAggregatedErrors,
  selectAggregatedRecoveryActions,
  selectAnalysisByNodeId,
  selectNodesSortedByCreatedAt,
  selectAverageSecurityScore,
  selectNodesMatchingSearch,
  selectNodesFilteredByProtocol,
  selectNodesFilteredByValidity,
  selectNodesSortedByField,
  selectNodesGroupedByProtocol,
  selectNodesWithUuid,
  selectNodesWithIpAddress,
  selectNodesWithDomainAddress,
  selectNodesWithReality,
  selectParserLog,
  selectDetectionLog,
  selectValidationFailureLog,
  selectDiagnosticsSortedBySeverity,
} from "../../core/store/selectors.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    ...overrides,
  }));
}

/**
 * Build a type-correct AnalysisObject fixture (06-ANALYZER_ENGINE / spec 05).
 * @param {number} securityScore
 */
function analysisWithScore(securityScore) {
  return {
    riskScore: 0,
    securityScore,
    compatibilityScore: 0,
    cloudflareDetected: false,
    realityDetected: false,
    workerDetected: false,
    cleanIPDetected: false,
    dnsLeakRisk: "none",
  };
}

describe("selectAllNodes / selectNodeById", () => {
  it("returns the full collection and looks up by nodeId", () => {
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });
    const state = { nodes: [a, b] };

    expect(selectAllNodes(state)).toEqual([a, b]);
    expect(selectNodeById(state, b.nodeId)).toBe(b);
    expect(selectNodeById(state, "not-a-real-id")).toBeUndefined();
  });
});

describe("selectValidNodeIds", () => {
  it("keeps only nodes whose Validation Engine result is overallValid", () => {
    const base = node();
    const valid = withValidation(base, { ...base.validation, overallValid: true });
    const invalid = node(); // emptyValidation() -> overallValid: false
    const state = { nodes: [valid, invalid] };

    expect(selectValidNodeIds(state)).toEqual([valid.nodeId]);
  });
});

describe("selectNodesSortedBySecurity", () => {
  it("sorts by analysis.securityScore, highest first", () => {
    const low = node({ analysis: analysisWithScore(20) });
    const high = node({ analysis: analysisWithScore(90) });
    const mid = node({ analysis: analysisWithScore(50) });
    const state = { nodes: [low, high, mid] };

    expect(selectNodesSortedBySecurity(state).map((n) => n.nodeId))
      .toEqual([high.nodeId, mid.nodeId, low.nodeId]);
  });

  it("sorts unscored nodes (no analysis yet) last, not first", () => {
    const scored = node({ analysis: analysisWithScore(10) });
    const unscored = node();
    const state = { nodes: [unscored, scored] };

    expect(selectNodesSortedBySecurity(state).map((n) => n.nodeId))
      .toEqual([scored.nodeId, unscored.nodeId]);
  });

  it("does not mutate the original nodes array", () => {
    const a = node({ analysis: analysisWithScore(10) });
    const b = node({ analysis: analysisWithScore(90) });
    const nodes = [a, b];
    const state = { nodes };

    selectNodesSortedBySecurity(state);

    expect(state.nodes).toBe(nodes);
    expect(state.nodes).toEqual([a, b]);
  });
});

describe("selectProtocolCounts", () => {
  it("tallies nodes by protocol (Converter Screen Parser Preview, doc 07 §4.2)", () => {
    const state = {
      nodes: [
        node({ protocol: "vless" }),
        node({ protocol: "vless" }),
        node({ protocol: "trojan" }),
      ],
    };

    expect(selectProtocolCounts(state)).toEqual({ vless: 2, trojan: 1 });
  });

  it("returns an empty object for an empty collection", () => {
    expect(selectProtocolCounts({ nodes: [] })).toEqual({});
  });
});

describe("selectAggregatedWarnings / selectAggregatedErrors / selectAggregatedRecoveryActions", () => {
  it("flattens metadata arrays across every node, in node order", () => {
    const a = node({ metadata: { warnings: ["w1"], errors: ["e1"], recoveryActions: ["r1"] } });
    const b = node({ metadata: { warnings: ["w2", "w3"], errors: [], recoveryActions: ["r2"] } });
    const state = { nodes: [a, b] };

    expect(selectAggregatedWarnings(state)).toEqual(["w1", "w2", "w3"]);
    expect(selectAggregatedErrors(state)).toEqual(["e1"]);
    expect(selectAggregatedRecoveryActions(state)).toEqual(["r1", "r2"]);
  });

  it("returns empty arrays when no node has any diagnostics", () => {
    const state = { nodes: [node(), node()] };

    expect(selectAggregatedWarnings(state)).toEqual([]);
    expect(selectAggregatedErrors(state)).toEqual([]);
    expect(selectAggregatedRecoveryActions(state)).toEqual([]);
  });
});

/**
 * @typedef {import("../../core/analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */

/**
 * Build a type-correct AnalysisBundle fixture (06-ANALYZER_ENGINE), mirroring
 * tests/store/analyzer-state.test.js's identical helper.
 * @param {number} securityScore
 * @returns {AnalysisBundle}
 */
function bundle(securityScore) {
  return {
    completeness: { missingFields: [], presentOptionalFields: [], completenessScore: 100 },
    protocol: { protocol: "vless", recognized: true },
    network: { network: "tcp", protocol: "vless", compatible: true, supportedNetworks: ["tcp"] },
    tls: { securityType: "none", applicable: false, coherent: true, knownFingerprint: null, issues: [] },
    reality: { applicable: false, compatible: true, pbkPlausible: null, sidPlausible: null, issues: [] },
    security: { securityScore, issues: [] },
  };
}

describe("selectAnalysisByNodeId", () => {
  it("looks up a node's Analyzer verdict bundle from AnalyzerState by nodeId", () => {
    const analysis = bundle(87);
    const state = { analysisByNodeId: { a: analysis } };

    expect(selectAnalysisByNodeId(state, "a")).toBe(analysis);
    expect(selectAnalysisByNodeId(state, "not-a-real-id")).toBeUndefined();
  });
});

describe("selectNodesSortedByCreatedAt", () => {
  it("sorts nodes by createdAt, most recent first (Dashboard's Recent Imports, doc 07 §4.1)", () => {
    const older = { ...node(), createdAt: "2024-01-01T00:00:00.000Z" };
    const newer = { ...node(), createdAt: "2024-06-01T00:00:00.000Z" };
    const state = { nodes: [older, newer] };

    expect(selectNodesSortedByCreatedAt(state)).toEqual([newer, older]);
  });

  it("does not mutate the original nodes array", () => {
    const nodes = [{ ...node(), createdAt: "2024-01-01T00:00:00.000Z" }];
    const state = { nodes };

    selectNodesSortedByCreatedAt(state);

    expect(state.nodes).toBe(nodes);
  });

  it("returns an empty array for an empty node list", () => {
    expect(selectNodesSortedByCreatedAt({ nodes: [] })).toEqual([]);
  });
});

describe("selectAverageSecurityScore", () => {
  it("averages security.securityScore across every analyzed node (Dashboard's Health Overview, doc 07 §4.1)", () => {
    const state = { analysisByNodeId: { a: bundle(80), b: bundle(40) } };

    expect(selectAverageSecurityScore(state)).toBe(60);
  });

  it("returns null when no node has been analyzed yet, never a fabricated 0 (Rule 9)", () => {
    expect(selectAverageSecurityScore({ analysisByNodeId: {} })).toBeNull();
  });
});

describe("selectNodesMatchingSearch", () => {
  it("matches case-insensitively across protocol/address/port (Subscription Center Search, doc 07 §4.4)", () => {
    const a = node({ protocol: "vless", address: "example.com", port: 443 });
    const b = node({ protocol: "trojan", address: "other.net", port: 8443 });
    const state = { nodes: [a, b] };

    expect(selectNodesMatchingSearch(state, "EXAMPLE")).toEqual([a]);
    expect(selectNodesMatchingSearch(state, "trojan")).toEqual([b]);
    expect(selectNodesMatchingSearch(state, "8443")).toEqual([b]);
  });

  it("returns every node for a blank query, not none", () => {
    const state = { nodes: [node(), node()] };

    expect(selectNodesMatchingSearch(state, "")).toEqual(state.nodes);
    expect(selectNodesMatchingSearch(state, "   ")).toEqual(state.nodes);
  });

  it("returns an empty array when nothing matches", () => {
    const state = { nodes: [node({ protocol: "vless" })] };

    expect(selectNodesMatchingSearch(state, "nomatch")).toEqual([]);
  });

  it("matches a Persian remark when the query is typed with Arabic letterforms (ك/ي vs ک/ی)", () => {
    // "کانفیگ" uses Persian Keheh (ک) and Persian Yeh (ی) — the form a node's
    // remark already has after the Parser Factory's normalizeText pass.
    const a = node({ remark: "کانفیگ" });
    const state = { nodes: [a] };

    // "كانفيگ" — same word, typed with an Arabic keyboard (ك Arabic Kaf, ي
    // Arabic Yeh) — must still find it via the query-side normalizeText pass.
    expect(selectNodesMatchingSearch(state, "كانفيگ")).toEqual([a]);
  });
});

describe("selectNodesFilteredByProtocol", () => {
  it("narrows to one protocol (Subscription Center Filter, doc 07 §4.4)", () => {
    const a = node({ protocol: "vless" });
    const b = node({ protocol: "trojan" });
    const state = { nodes: [a, b] };

    expect(selectNodesFilteredByProtocol(state, "vless")).toEqual([a]);
  });

  it("\"all\" is the no-op case, returning every node", () => {
    const state = { nodes: [node({ protocol: "vless" }), node({ protocol: "trojan" })] };

    expect(selectNodesFilteredByProtocol(state, "all")).toEqual(state.nodes);
  });
});

describe("selectNodesFilteredByValidity", () => {
  it("narrows by validation.overallValid (Subscription Center Filter, doc 07 §4.4)", () => {
    const base = node();
    const valid = withValidation(base, { ...base.validation, overallValid: true });
    const invalid = node(); // emptyValidation() -> overallValid: false
    const state = { nodes: [valid, invalid] };

    expect(selectNodesFilteredByValidity(state, "valid")).toEqual([valid]);
    expect(selectNodesFilteredByValidity(state, "invalid")).toEqual([invalid]);
  });

  it("\"all\" is the no-op case, returning every node", () => {
    const state = { nodes: [node(), node()] };

    expect(selectNodesFilteredByValidity(state, "all")).toEqual(state.nodes);
  });
});

describe("selectNodesSortedByField", () => {
  it("sorts ascending or descending by protocol/address/port/createdAt (Subscription Center Sort, doc 07 §4.4)", () => {
    const a = node({ protocol: "trojan", address: "b.example.com", port: 100 });
    const b = node({ protocol: "vless", address: "a.example.com", port: 200 });
    const state = { nodes: [a, b] };

    expect(selectNodesSortedByField(state, "protocol", "asc").map((n) => n.nodeId)).toEqual([a.nodeId, b.nodeId]);
    expect(selectNodesSortedByField(state, "protocol", "desc").map((n) => n.nodeId)).toEqual([b.nodeId, a.nodeId]);
    expect(selectNodesSortedByField(state, "address", "asc").map((n) => n.nodeId)).toEqual([b.nodeId, a.nodeId]);
    expect(selectNodesSortedByField(state, "port", "asc").map((n) => n.nodeId)).toEqual([a.nodeId, b.nodeId]);
  });

  it("does not mutate the original nodes array", () => {
    const nodes = [node({ port: 200 }), node({ port: 100 })];
    const state = { nodes };

    selectNodesSortedByField(state, "port", "asc");

    expect(state.nodes).toBe(nodes);
  });
});

describe("selectNodesGroupedByProtocol", () => {
  it("groups full node lists by protocol (Subscription Center Group, doc 07 §4.4)", () => {
    const a = node({ protocol: "vless" });
    const b = node({ protocol: "vless" });
    const c = node({ protocol: "trojan" });
    const state = { nodes: [a, b, c] };

    expect(selectNodesGroupedByProtocol(state)).toEqual({
      vless: [a, b],
      trojan: [c],
    });
  });

  it("returns an empty object for an empty collection", () => {
    expect(selectNodesGroupedByProtocol({ nodes: [] })).toEqual({});
  });
});

describe("selectNodesWithUuid", () => {
  it("keeps only nodes carrying a uuid (Extractor Screen's UUID Extractor, doc 07 §4.5)", () => {
    const withUuid = node({ protocol: "vless", uuid: "b831381d-6324-4d53-ad4f-8cda48b30811" });
    const withoutUuid = node({ protocol: "trojan" });
    const state = { nodes: [withUuid, withoutUuid] };

    expect(selectNodesWithUuid(state)).toEqual([withUuid]);
  });

  it("returns an empty array when no node carries a uuid", () => {
    expect(selectNodesWithUuid({ nodes: [node(), node()] })).toEqual([]);
  });
});

describe("selectNodesWithIpAddress / selectNodesWithDomainAddress", () => {
  it("splits nodes by whether address is a literal IP or a domain (Extractor Screen's IP/Domain Extractor, doc 07 §4.5)", () => {
    const ipv4 = node({ address: "203.0.113.10" });
    const ipv6 = node({ address: "2001:db8::1" });
    const domain = node({ address: "example.com" });
    const state = { nodes: [ipv4, ipv6, domain] };

    expect(selectNodesWithIpAddress(state)).toEqual([ipv4, ipv6]);
    expect(selectNodesWithDomainAddress(state)).toEqual([domain]);
  });

  it("returns empty arrays for an empty collection", () => {
    expect(selectNodesWithIpAddress({ nodes: [] })).toEqual([]);
    expect(selectNodesWithDomainAddress({ nodes: [] })).toEqual([]);
  });
});

describe("selectNodesWithReality", () => {
  it("keeps only nodes using Reality (Extractor Screen's Reality Extractor, doc 07 §4.5)", () => {
    const reality = node({ security: "reality", pbk: "pbk-value", sid: "sid-value" });
    const plain = node({ security: "none" });
    const state = { nodes: [reality, plain] };

    expect(selectNodesWithReality(state)).toEqual([reality]);
  });

  it("returns an empty array when no node uses Reality", () => {
    expect(selectNodesWithReality({ nodes: [node({ security: "tls" })] })).toEqual([]);
  });
});

describe("selectParserLog", () => {
  it("projects parser, sourceType, and createdAt per node (Developer Console's Parser Logs, doc 07 §4.7)", () => {
    const a = node({ sourceType: "vless-url", metadata: { parser: "url-parser" } });
    const b = node({ sourceType: "trojan-url", metadata: { parser: "url-parser" } });
    const state = { nodes: [a, b] };

    expect(selectParserLog(state)).toEqual([
      { nodeId: a.nodeId, parser: "url-parser", sourceType: "vless-url", createdAt: a.createdAt },
      { nodeId: b.nodeId, parser: "url-parser", sourceType: "trojan-url", createdAt: b.createdAt },
    ]);
  });

  it("returns an empty array for an empty collection", () => {
    expect(selectParserLog({ nodes: [] })).toEqual([]);
  });
});

describe("selectDetectionLog", () => {
  it("projects parser and confidence per node (Developer Console's Detection Logs, doc 07 §4.7 / doc 04 Stage 02)", () => {
    const a = node({ metadata: { parser: "xray-parser", confidence: 95 } });
    const b = node({ metadata: { parser: "url-parser", confidence: 75 } });
    const state = { nodes: [a, b] };

    expect(selectDetectionLog(state)).toEqual([
      { nodeId: a.nodeId, parser: "xray-parser", confidence: 95 },
      { nodeId: b.nodeId, parser: "url-parser", confidence: 75 },
    ]);
  });

  it("returns an empty array for an empty collection", () => {
    expect(selectDetectionLog({ nodes: [] })).toEqual([]);
  });
});

describe("selectValidationFailureLog", () => {
  it("keeps only fields explicitly false, excluding null (not-applicable) and overallValid", () => {
    const a = node();
    const failing = withValidation(a, {
      addressValid: true,
      portValid: false,
      uuidValid: null,
      realityValid: null,
      tlsValid: false,
      alpnValid: null,
      pathValid: null,
      hostValid: null,
      overallValid: false,
    });
    const state = { nodes: [failing] };

    expect(selectValidationFailureLog(state)).toEqual([
      { nodeId: failing.nodeId, field: "portValid" },
      { nodeId: failing.nodeId, field: "tlsValid" },
    ]);
  });

  it("returns an empty array when no node has a real field failure", () => {
    const valid = withValidation(node(), {
      addressValid: true,
      portValid: true,
      uuidValid: null,
      realityValid: null,
      tlsValid: null,
      alpnValid: null,
      pathValid: null,
      hostValid: null,
      overallValid: true,
    });

    expect(selectValidationFailureLog({ nodes: [valid] })).toEqual([]);
  });

  it("returns an empty array for an empty collection", () => {
    expect(selectValidationFailureLog({ nodes: [] })).toEqual([]);
  });
});

describe("selectDiagnosticsSortedBySeverity", () => {
  it("ranks critical/error before warning/info, recovering each line's real registered severity via getErrorDef (Orphan Check item #4)", () => {
    const n = node({
      metadata: {
        // Deliberately out of severity order in storage — the selector, not
        // insertion order, must do the ranking.
        warnings: ["VAL_TLS_NO_SNI: security=tls without an SNI may fail on SNI-strict servers."],
        errors: ["VAL_ADDRESS_INVALID: Address is neither a valid domain nor a valid IP."],
      },
    });
    const state = { nodes: [n] };

    expect(selectDiagnosticsSortedBySeverity(state)).toEqual([
      {
        nodeId: n.nodeId,
        code: "VAL_ADDRESS_INVALID",
        severity: "error",
        message: "Address is neither a valid domain nor a valid IP.",
      },
      {
        nodeId: n.nodeId,
        code: "VAL_TLS_NO_SNI",
        severity: "warning",
        message: "security=tls without an SNI may fail on SNI-strict servers.",
      },
    ]);
  });

  it("uses compareSeverity for the real registry ordering, not insertion order, across multiple nodes", () => {
    const critical = node({ metadata: { errors: ["UNM_INVARIANT_VIOLATION: A UNM invariant was violated during node construction."] } });
    const info = node({ metadata: { warnings: ["PARSE_UNKNOWN_FIELD: An unrecognized field was ignored."] } });
    const warning = node({ metadata: { warnings: ["VAL_ALPN_INVALID: ALPN contains an unrecognized protocol identifier."] } });
    const state = { nodes: [info, warning, critical] };

    expect(selectDiagnosticsSortedBySeverity(state).map((d) => d.code)).toEqual([
      "UNM_INVARIANT_VIOLATION",
      "VAL_ALPN_INVALID",
      "PARSE_UNKNOWN_FIELD",
    ]);
  });

  it("skips a line that does not start with a registered error code rather than guessing its severity", () => {
    const n = node({ metadata: { warnings: ["not a registered diagnostic line"] } });

    expect(selectDiagnosticsSortedBySeverity({ nodes: [n] })).toEqual([]);
  });

  it("returns an empty array when no node has any diagnostics", () => {
    expect(selectDiagnosticsSortedBySeverity({ nodes: [node(), node()] })).toEqual([]);
  });

  it("returns an empty array for an empty collection", () => {
    expect(selectDiagnosticsSortedBySeverity({ nodes: [] })).toEqual([]);
  });
});
