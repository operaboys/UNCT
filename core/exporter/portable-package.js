/**
 * Portable Project Package — 08-EXPORT_ENGINE §7 (Backup/Snapshot).
 *
 * Exports a self-contained ZIP snapshot of the current project state:
 *  - `nodes.json` — all UNMNodes in Normalized JSON (the round-trip-eligible
 *    lossless form, identical to to-zip.js's nodes.json)
 *  - `settings.json` — user preferences (themeChoice, languageChoice)
 *  - `manifest.json` — shape version, date, node count, UNM schema version,
 *    plus `packageType: "portable-project"` to distinguish from a regular ZIP
 *    Export (to-zip.js), which sets no packageType.
 *
 * Import (round-trip): `importPortablePackage` decompresses the archive,
 * validates the manifest, and re-constructs each node via `createNode` —
 * Rule 4 (doc 05) always generates fresh nodeId/createdAt/updatedAt, so the
 * restored nodes carry all original domain fields (protocol, address, port,
 * credentials, security, extensions …) but new system identifiers.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { UNM_SCHEMA_VERSION } from "../unm/registry/schema-registry.js";
import { exportNormalizedJson } from "./to-json.js";
import { createNode } from "../unm/create-node.js";

/** Version of this portable-package manifest shape — bump only when the manifest fields change. */
export const PORTABLE_PACKAGE_VERSION = "1.0";

/**
 * @param {readonly UNMNode[]} nodes
 * @param {{ themeChoice?: string, languageChoice?: string }} [settings]
 * @returns {{ content: Uint8Array }}
 */
export function exportPortablePackage(nodes, settings = {}) {
  const manifest = {
    packageType: "portable-project",
    exportVersion: PORTABLE_PACKAGE_VERSION,
    exportDate: new Date().toISOString(),
    nodeCount: nodes.length,
    unmVersion: UNM_SCHEMA_VERSION,
  };

  const settingsData = {
    themeChoice: settings.themeChoice ?? "auto",
    languageChoice: settings.languageChoice ?? "auto",
  };

  /** @type {import("fflate").Zippable} */
  const files = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "nodes.json": strToU8(exportNormalizedJson(nodes)),
    "settings.json": strToU8(JSON.stringify(settingsData, null, 2)),
  };

  return { content: zipSync(files) };
}

/**
 * Decompress and restore a portable project package.
 *
 * @param {Uint8Array} zipBytes
 * @returns {{
 *   nodes: Readonly<UNMNode>[],
 *   settings: { themeChoice: string, languageChoice: string },
 *   manifest: { packageType: string, exportVersion: string, exportDate: string, nodeCount: number, unmVersion: string }
 * }}
 * @throws {Error} if the bytes are not a valid ZIP, manifest is missing, or packageType is wrong.
 */
export function importPortablePackage(zipBytes) {
  /** @type {import("fflate").Unzipped} */
  let unzipped;
  try {
    unzipped = unzipSync(zipBytes);
  } catch (err) {
    throw new Error(`importPortablePackage: not a valid ZIP file: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!unzipped["manifest.json"]) {
    throw new Error("importPortablePackage: missing manifest.json — not a portable package");
  }

  /** @type {any} */
  let manifest;
  try {
    manifest = JSON.parse(strFromU8(unzipped["manifest.json"]));
  } catch {
    throw new Error("importPortablePackage: manifest.json is not valid JSON");
  }

  if (manifest.packageType !== "portable-project") {
    throw new Error(
      `importPortablePackage: expected packageType "portable-project", got "${String(manifest.packageType)}"`,
    );
  }

  if (!unzipped["nodes.json"]) {
    throw new Error("importPortablePackage: missing nodes.json");
  }

  /** @type {any} */
  let rawNodes;
  try {
    rawNodes = JSON.parse(strFromU8(unzipped["nodes.json"]));
  } catch {
    throw new Error("importPortablePackage: nodes.json is not valid JSON");
  }

  if (!Array.isArray(rawNodes)) {
    throw new Error("importPortablePackage: nodes.json must contain an array");
  }

  // Re-construct via createNode so every restored node has fresh nodeId/timestamps
  // (Rule 4 — system-generated, never from external input) while preserving all
  // domain fields (protocol, address, credentials, extensions, metadata …).
  /** @type {Readonly<UNMNode>[]} */
  const nodes = [];
  for (const raw of rawNodes) {
    try {
      nodes.push(createNode(/** @type {any} */ (raw)));
    } catch {
      // Skip unrestorable entries; never fabricate a node (ANTI_CHAOS Rule 9)
    }
  }

  let settings = { themeChoice: "auto", languageChoice: "auto" };
  if (unzipped["settings.json"]) {
    try {
      const parsed = JSON.parse(strFromU8(unzipped["settings.json"]));
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.themeChoice === "string") settings.themeChoice = parsed.themeChoice;
        if (typeof parsed.languageChoice === "string") settings.languageChoice = parsed.languageChoice;
      }
    } catch {
      // corrupt settings.json — use defaults silently
    }
  }

  return { nodes, settings, manifest };
}
