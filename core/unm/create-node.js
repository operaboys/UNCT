/**
 * UNM node factory — the ONLY sanctioned way to construct a UNMNode.
 *
 * Enforces the invariants from 05-UNIVERSAL_NODE_MODEL (ADR-002):
 *  - nodeId / createdAt / updatedAt are system-generated, never from input (Rule 4)
 *  - metadata.warnings / errors / recoveryActions / originalMappings are never
 *    null — always present (Rule 5)
 *  - network defaults to "tcp", security to "none" (§2)
 *  - validation is always present (§5)
 *  - the returned node is deep-frozen — Immutable (Rule 8)
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../types/unm").MetadataObject} MetadataObject
 * @typedef {import("../types/unm").ValidationObject} ValidationObject
 */

import {
  DEFAULT_NETWORK, DEFAULT_SECURITY, emptyMetadata, emptyValidation,
} from "./schema/defaults.js";
import { isProtocol, isSourceType } from "./schema/enums.js";

/**
 * Input accepted by createNode: the parser-supplied portion of a node. The
 * factory layers the system-generated and defaulted fields on top.
 *
 * @typedef {Object} CreateNodeInput
 * @property {import("../types/unm").SourceType} sourceType
 * @property {import("../types/unm").Protocol} protocol
 * @property {string} address
 * @property {number} port
 * @property {Partial<MetadataObject>} [metadata]
 * @property {ValidationObject} [validation]
 * @property {Record<string, unknown>} [rest]  // any further optional UNM fields
 */

const ISO_NOW = () => new Date().toISOString();

/** @returns {string} a fresh UUID v4 */
function generateNodeId() {
  const c = /** @type {Crypto | undefined} */ (globalThis.crypto);
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Minimal RFC-4122 v4 fallback (e.g. non-secure contexts). Not for crypto use.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Merge a partial metadata object onto the empty defaults, guaranteeing the
 * array/record fields are never null/undefined.
 * @param {Partial<MetadataObject> | undefined} partial
 * @returns {MetadataObject}
 */
function buildMetadata(partial) {
  const base = emptyMetadata();
  if (!partial) return base;
  return {
    parser: partial.parser ?? base.parser,
    confidence: partial.confidence ?? base.confidence,
    sourceFile: partial.sourceFile,
    sourceLine: partial.sourceLine,
    formatVersion: partial.formatVersion,
    warnings: Array.isArray(partial.warnings) ? [...partial.warnings] : base.warnings,
    errors: Array.isArray(partial.errors) ? [...partial.errors] : base.errors,
    recoveryActions: Array.isArray(partial.recoveryActions)
      ? [...partial.recoveryActions] : base.recoveryActions,
    originalMappings: partial.originalMappings
      ? { ...partial.originalMappings } : base.originalMappings,
  };
}

/**
 * Recursively freeze a value (deep freeze) to enforce Immutability (Rule 8).
 * @template T
 * @param {T} obj
 * @returns {Readonly<T>}
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) {
    return obj;
  }
  for (const key of Object.keys(obj)) {
    deepFreeze(/** @type {Record<string, unknown>} */ (obj)[key]);
  }
  return Object.freeze(obj);
}

/**
 * Construct an immutable UNMNode from parser-supplied data.
 *
 * @param {CreateNodeInput & Partial<UNMNode>} input
 * @returns {Readonly<UNMNode>}
 * @throws {Error} if a required identity field is missing or invalid — the
 *   parser is responsible for recovery BEFORE constructing a node
 *   (04-PARSER_ENGINE: a node without protocol/address/port cannot exist).
 */
export function createNode(input) {
  if (!input || typeof input !== "object") {
    throw new Error("createNode: input object is required (UNM_INVARIANT_VIOLATION)");
  }
  if (!isSourceType(input.sourceType)) {
    throw new Error(`createNode: invalid sourceType "${String(input.sourceType)}" (UNM_INVARIANT_VIOLATION)`);
  }
  if (!isProtocol(input.protocol)) {
    throw new Error(`createNode: invalid protocol "${String(input.protocol)}" (UNM_INVARIANT_VIOLATION)`);
  }
  if (typeof input.address !== "string" || input.address.length === 0) {
    throw new Error("createNode: address is required (UNM_INVARIANT_VIOLATION)");
  }
  if (typeof input.port !== "number" || !Number.isInteger(input.port)) {
    throw new Error("createNode: port must be an integer (UNM_INVARIANT_VIOLATION)");
  }

  const now = ISO_NOW();

  // Start from caller fields, then overwrite the protected/defaulted ones so
  // raw input can never inject nodeId/timestamps (Rule 4).
  /** @type {UNMNode} */
  const node = {
    ...(/** @type {Partial<UNMNode>} */ (input)),
    nodeId: generateNodeId(),
    sourceType: input.sourceType,
    protocol: input.protocol,
    address: input.address,
    port: input.port,
    network: input.network ?? DEFAULT_NETWORK,
    security: input.security ?? DEFAULT_SECURITY,
    createdAt: now,
    updatedAt: now,
    metadata: buildMetadata(input.metadata),
    validation: input.validation ?? emptyValidation(),
  };

  return deepFreeze(node);
}

/**
 * Produce a NEW node with an updated ValidationObject — structural sharing per
 * Rule 8 (never mutate the original). Also bumps updatedAt.
 *
 * @param {UNMNode} node
 * @param {ValidationObject} validation
 * @returns {Readonly<UNMNode>}
 */
export function withValidation(node, validation) {
  return deepFreeze({ ...node, validation, updatedAt: ISO_NOW() });
}
