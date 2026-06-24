/**
 * UNM — public entry point. The single source of truth for the Universal Node
 * Model (ADR-002). Everything outside the Parser/Importer consumes UNM only.
 * @module core/unm
 */
export { createNode, withValidation, deepFreeze } from "./create-node.js";

export {
  SOURCE_TYPES, PROTOCOLS, NETWORK_TYPES, SECURITY_TYPES, UUID_PROTOCOLS,
  isSourceType, isProtocol, isNetworkType, isSecurityType,
  DEFAULT_NETWORK, DEFAULT_SECURITY, emptyMetadata, emptyValidation,
} from "./schema/index.js";

export {
  NETWORK_TYPE_MAP, SECURITY_TYPE_MAP, PROTOCOL_MAP, normalizeValue,
} from "./mapper/normalization-map.js";
