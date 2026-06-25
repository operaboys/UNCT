/**
 * ParserWorker — REAL wrapper (09-DEVELOPMENT_ROADMAP Phase 5). The Parser
 * itself is complete and frozen (Phase 2-4); this file adds zero parsing
 * logic of its own (ADR-003) — it only calls `ParserFactory.parseWithFallback`
 * + `normalizeAll` (12-PARSER_FACTORY §5) and `applyValidation`
 * (the same `parse -> normalize -> applyValidation` chain the Phase 2/3
 * Foundation Gate already drives directly), then flattens each resulting
 * `UNMNode` before it leaves the Worker (10-PERFORMANCE_ENGINE §3 "Flatten
 * Before PostMessage").
 *
 * Input payload: `{ raw: string }` (one raw config text/blob).
 * Output result: `{ parserName: string, recovered: boolean, nodes: FlatNode[] }`.
 *
 * Flatten projection: a `UNMNode`'s four sub-objects (`metadata`,
 * `validation`, `analysis`, `conversion`) never get nested into the posted
 * message. `validation`/`analysis`/`conversion` field names don't collide
 * with top-level `UNMNode` fields or each other (verified against
 * `core/types/unm.d.ts`), so they're spread directly. `metadata`'s field
 * names (`parser`, `confidence`, `warnings`, `errors`, ...) are generic
 * enough to risk colliding with future Analyzer/Converter output, so they
 * get a `meta`-prefix instead.
 */
import { createParserFactory, normalizeAll } from "../parser/factory.js";
import { registerXrayParser } from "../parser/xray/index.js";
import { registerSingBoxParser } from "../parser/singbox/index.js";
import { registerClashParser } from "../parser/clash/index.js";
import { registerUrlParser } from "../parser/url/index.js";
import { registerSubscriptionParser } from "../parser/subscription/index.js";
import { registerWireguardParser } from "../parser/wireguard/index.js";
import { applyValidation } from "../validator/apply-validation.js";
import { createWorkerEntry } from "./shared/handler-envelope.js";

/** Registration order = 12-PARSER_FACTORY §5 fallback order (same as the Foundation Gate). */
function buildParserFactory() {
  const f = createParserFactory();
  registerXrayParser(f);
  registerSingBoxParser(f);
  registerClashParser(f);
  registerUrlParser(f);
  registerSubscriptionParser(f);
  registerWireguardParser(f);
  return f;
}

const factory = buildParserFactory();

/**
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

/**
 * @param {Readonly<UNMNode>} node
 * @returns {Record<string, unknown>}
 */
export function flattenNode(node) {
  const { metadata, validation, analysis, conversion, ...core } = node;
  return {
    ...core,
    ...validation,
    ...(analysis || {}),
    ...(conversion || {}),
    metaParser: metadata.parser,
    metaConfidence: metadata.confidence,
    metaSourceFile: metadata.sourceFile,
    metaSourceLine: metadata.sourceLine,
    metaFormatVersion: metadata.formatVersion,
    metaWarnings: metadata.warnings,
    metaErrors: metadata.errors,
    metaRecoveryActions: metadata.recoveryActions,
    metaOriginalMappings: metadata.originalMappings,
  };
}

/**
 * @param {unknown} payload
 */
function processParserPayload(payload) {
  const raw = /** @type {{ raw?: unknown }} */ (payload || {}).raw;
  if (typeof raw !== "string") {
    throw new Error("parser.worker: payload.raw must be a string (WORKER_CONTRACT_VIOLATION)");
  }
  const { name, extraction, recovered } = factory.parseWithFallback(raw);
  const parser = factory.get(name);
  const nodes = normalizeAll(parser, extraction).map(applyValidation);
  return { parserName: name, recovered, nodes: nodes.map(flattenNode) };
}

/** Pure, directly-callable handler; also self-wires to `self.onmessage` under feature detection. */
export const handleParserJob = createWorkerEntry(processParserPayload);
