/**
 * unflattenNode(flat) — exact inverse of `parser.worker.js#flattenNode`,
 * reconstructing a real (nested, deep-frozen) UNMNode from the flat wire
 * object a Worker posts back across the thread boundary (10-PERFORMANCE_
 * ENGINE §3 "Flatten Before PostMessage"). Lives in a NEW file rather than
 * editing `parser.worker.js` itself — that file is an already-frozen Phase 5
 * deliverable (ADR-003) this step does not touch.
 *
 * `analysis`/`conversion` are optional on UNMNode (05-UNIVERSAL_NODE_MODEL
 * §4/§6 — empty until the Analyzer/Converter run); `flattenNode` spreads
 * `analysis || {}` / `conversion || {}`, so their absence on the flat object
 * is detected here by checking for one always-present field from each
 * (`riskScore`, `canExportAsUrl` — per `core/types/unm.d.ts`) rather than by
 * field value, since a present-but-falsy value (e.g. `riskScore: 0`) must
 * still round-trip as "analysis was present".
 *
 * Re-applies the project's deep-freeze Immutability convention (Rule 8,
 * `core/unm/create-node.js#deepFreeze`) so a Worker-sourced node is
 * indistinguishable from one built by `createNode`/`withValidation`.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */
import { deepFreeze } from "../unm/create-node.js";

const VALIDATION_KEYS = [
  "addressValid", "portValid", "uuidValid", "realityValid",
  "tlsValid", "alpnValid", "pathValid", "hostValid", "overallValid",
];

const ANALYSIS_KEYS = [
  "riskScore", "securityScore", "compatibilityScore", "cloudflareDetected",
  "realityDetected", "workerDetected", "cleanIPDetected", "dnsLeakRisk",
];

const CONVERSION_KEYS = [
  "canExportAsUrl", "canExportAsXrayJson", "canExportAsSingboxJson", "canExportAsClashYaml",
];

const META_KEYS = [
  "metaParser", "metaConfidence", "metaSourceFile", "metaSourceLine",
  "metaFormatVersion", "metaWarnings", "metaErrors", "metaRecoveryActions",
  "metaOriginalMappings",
];

/**
 * @param {Record<string, unknown>} flat
 * @param {string[]} keys
 * @returns {Record<string, unknown>}
 */
function pick(flat, keys) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of keys) out[key] = flat[key];
  return out;
}

/**
 * @param {Record<string, unknown>} flat
 * @returns {Readonly<UNMNode>}
 */
export function unflattenNode(flat) {
  const hasAnalysis = Object.prototype.hasOwnProperty.call(flat, "riskScore");
  const hasConversion = Object.prototype.hasOwnProperty.call(flat, "canExportAsUrl");

  const validation = pick(flat, VALIDATION_KEYS);
  const metadata = {
    parser: flat.metaParser,
    confidence: flat.metaConfidence,
    sourceFile: flat.metaSourceFile,
    sourceLine: flat.metaSourceLine,
    formatVersion: flat.metaFormatVersion,
    warnings: flat.metaWarnings,
    errors: flat.metaErrors,
    recoveryActions: flat.metaRecoveryActions,
    originalMappings: flat.metaOriginalMappings,
  };

  /** @type {Record<string, unknown>} */
  const core = { ...flat };
  for (const key of [...VALIDATION_KEYS, ...META_KEYS]) delete core[key];
  if (hasAnalysis) for (const key of ANALYSIS_KEYS) delete core[key];
  if (hasConversion) for (const key of CONVERSION_KEYS) delete core[key];

  /** @type {UNMNode} */
  const node = /** @type {any} */ ({
    ...core,
    validation,
    metadata,
    ...(hasAnalysis ? { analysis: pick(flat, ANALYSIS_KEYS) } : {}),
    ...(hasConversion ? { conversion: pick(flat, CONVERSION_KEYS) } : {}),
  });

  return deepFreeze(node);
}
