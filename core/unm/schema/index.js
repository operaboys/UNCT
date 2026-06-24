/**
 * UNM schema — public entry point for runtime enums and defaults.
 * @module core/unm/schema
 */
export {
  SOURCE_TYPES, PROTOCOLS, NETWORK_TYPES, SECURITY_TYPES, UUID_PROTOCOLS,
  isSourceType, isProtocol, isNetworkType, isSecurityType,
} from "./enums.js";

export {
  DEFAULT_NETWORK, DEFAULT_SECURITY, emptyMetadata, emptyValidation,
} from "./defaults.js";
