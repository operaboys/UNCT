/**
 * Validation Engine — 04-PARSER_ENGINE Stage 13 / 05-UNIVERSAL_NODE_MODEL §5.
 *
 * Scope Rule (Stage 13): validation is ALWAYS Node-by-Node — the whole UNMNode
 * is passed in and a complete ValidationObject comes out, because cross-field
 * checks (Reality↔PBK, TLS↔SNI) need several fields at once.
 *
 * Flag semantics (Phase 1):
 *  - A per-field `*Valid` flag is `false` only on an ERROR-level failure of that
 *    field; `null` when the field is not meaningful for the node; otherwise true.
 *  - WARNING-level issues produce a Diagnostic but do NOT flip a flag to false,
 *    so overallValid stays true. (This is the documented compromise for
 *    overallValid not encoding severity — 05 §5 note.)
 *  - overallValid = no flag is `false` (null and true both pass).
 *
 * Pure & Sync — directly unit-testable (15-TESTING_FRAMEWORK §Testing Infra).
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../types/unm").ValidationObject} ValidationObject
 * @typedef {import("../types/errors").Diagnostic} Diagnostic
 */

import { makeDiagnostic } from "../errors/registry.js";
import { UUID_PROTOCOLS } from "../unm/schema/enums.js";
import {
  isValidPort, isValidAddress, isValidUUID, isValidHost, isValidPath,
  isValidAlpn, isKnownAlpn,
} from "./validators.js";

/**
 * Validate a single node.
 * @param {UNMNode} node
 * @returns {{ validation: ValidationObject, diagnostics: Diagnostic[] }}
 */
export function validateNode(node) {
  /** @type {Diagnostic[]} */
  const diagnostics = [];

  // ----- address (always meaningful) -----
  const addressValid = isValidAddress(node.address);
  if (!addressValid) {
    diagnostics.push(makeDiagnostic("VAL_ADDRESS_INVALID", { field: "address", detail: String(node.address) }));
  }

  // ----- port (always meaningful) -----
  const portValid = isValidPort(node.port);
  if (!portValid) {
    diagnostics.push(makeDiagnostic("VAL_PORT_OUT_OF_RANGE", { field: "port", detail: String(node.port) }));
  }

  // ----- uuid (only meaningful for VLESS/VMESS) -----
  /** @type {boolean | null} */
  let uuidValid = null;
  if (UUID_PROTOCOLS.includes(node.protocol)) {
    uuidValid = isValidUUID(node.uuid);
    if (!uuidValid) {
      diagnostics.push(makeDiagnostic("VAL_UUID_INVALID", { field: "uuid" }));
    }
  }

  // ----- reality cross-field: reality requires pbk (Stage 13 Cross-Field) -----
  /** @type {boolean | null} */
  let realityValid = null;
  if (node.security === "reality") {
    const hasPbk = typeof node.pbk === "string" && node.pbk.length > 0;
    realityValid = hasPbk;
    if (!hasPbk) {
      diagnostics.push(makeDiagnostic("VAL_REALITY_NO_PBK", { field: "pbk" }));
    }
  }

  // ----- tls cross-field: tls SHOULD have sni (warning only) -----
  /** @type {boolean | null} */
  let tlsValid = null;
  if (node.security === "tls") {
    tlsValid = true; // no hard error defined; SNI absence is a warning
    const hasSni = typeof node.sni === "string" && node.sni.length > 0;
    if (!hasSni) {
      diagnostics.push(makeDiagnostic("VAL_TLS_NO_SNI", { field: "sni" }));
    }
  }

  // ----- alpn (only when present) -----
  /** @type {boolean | null} */
  let alpnValid = null;
  if (node.alpn !== undefined) {
    alpnValid = isValidAlpn(node.alpn);
    if (!alpnValid) {
      diagnostics.push(makeDiagnostic("VAL_ALPN_INVALID", { field: "alpn" }));
    } else if (!isKnownAlpn(node.alpn)) {
      // structurally fine but contains an unrecognized id -> warning, flag stays true
      diagnostics.push(makeDiagnostic("VAL_ALPN_INVALID", {
        field: "alpn",
        message: "ALPN contains an unrecognized but well-formed identifier.",
      }));
    }
  }

  // ----- path (only when present) -----
  /** @type {boolean | null} */
  let pathValid = null;
  if (node.path !== undefined) {
    pathValid = isValidPath(node.path);
    if (!pathValid) {
      diagnostics.push(makeDiagnostic("VAL_PATH_INVALID", { field: "path" }));
    }
  }

  // ----- host (only when present) -----
  /** @type {boolean | null} */
  let hostValid = null;
  if (node.host !== undefined) {
    hostValid = isValidHost(node.host);
    if (!hostValid) {
      diagnostics.push(makeDiagnostic("VAL_HOST_INVALID", { field: "host" }));
    }
  }

  // ----- wireguard cross-field: requires endpoint (address+port) -----
  if (node.protocol === "wireguard" && (!addressValid || !portValid)) {
    diagnostics.push(makeDiagnostic("VAL_WIREGUARD_NO_ENDPOINT"));
  }

  const flags = [
    addressValid, portValid, uuidValid, realityValid,
    tlsValid, alpnValid, pathValid, hostValid,
  ];
  const overallValid = flags.every((f) => f !== false);

  /** @type {ValidationObject} */
  const validation = {
    addressValid, portValid, uuidValid, realityValid,
    tlsValid, alpnValid, pathValid, hostValid, overallValid,
  };

  return { validation, diagnostics };
}
