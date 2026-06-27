/**
 * YAML Export — Export Engine (08-EXPORT_ENGINE §4, ADR-004). Doc 08 §4
 * scope: "Clash · Clash Meta · Mihomo · Provider Files". `to-clash.js`'s own
 * doc comment already targets Clash AND Clash.Meta with the same proxy
 * shape (Mihomo is a Clash.Meta-compatible fork reading the same shape), and
 * a Clash "Provider File" is, by Clash's own spec, just a YAML document with
 * a top-level `proxies:` key — exactly what this already emits. So one
 * batched serializer covers all four named targets; none needs separate
 * code.
 *
 * Reuses the Converter Engine's existing per-node serializer (`to-clash.js`
 * via `convertBatch`, ADR-012) and merges each one's single-element
 * `proxies` array, the same merge-don't-reimplement approach as
 * `to-json.js`'s Xray/Sing-box batching.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */
import yaml from "js-yaml";
import { convertBatch } from "../converter/conversion.js";

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {{ content: string, skipped: {nodeId: string, protocol: string}[] }}
 */
export function exportClashYaml(nodes) {
  const { converted, skipped } = convertBatch(nodes, "clashYaml");
  const proxies = converted.flatMap((c) => /** @type {{proxies: unknown[]}} */ (yaml.load(c.output)).proxies);
  return { content: yaml.dump({ proxies }), skipped };
}
