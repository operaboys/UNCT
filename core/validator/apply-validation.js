/**
 * applyValidation — run the Validation Engine on a node and fold the result back
 * in as a NEW immutable node (structural sharing per 05 Rule 8).
 *
 * Diagnostic messages are merged into metadata: error/critical -> metadata.errors,
 * info/warning -> metadata.warnings. The structured ValidationObject lands in
 * node.validation.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

import { withValidation } from "../unm/create-node.js";
import { validateNode } from "./validate-node.js";

/**
 * @param {UNMNode} node
 * @returns {Readonly<UNMNode>}
 */
export function applyValidation(node) {
  const { validation, diagnostics } = validateNode(node);

  const warnings = [...node.metadata.warnings];
  const errors = [...node.metadata.errors];
  for (const d of diagnostics) {
    const line = `${d.code}: ${d.message}`;
    if (d.severity === "error" || d.severity === "critical") errors.push(line);
    else warnings.push(line);
  }

  const metadata = { ...node.metadata, warnings, errors };
  return withValidation({ ...node, metadata }, validation);
}
