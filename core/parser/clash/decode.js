/**
 * Clash YAML decode — 04-PARSER_ENGINE Stage 06.
 *
 * Per 14-DEPENDENCY_POLICY §5 ("no custom YAML parser — use a proven YAML
 * engine, js-yaml") this wraps js-yaml's safe loader. `yaml.load` uses the
 * default (safe) schema in js-yaml v4 — no code/function/regexp construction.
 *
 * NOTE (ADR-005): js-yaml is the project's first runtime dependency. In Node /
 * Vitest it imports directly; its browser delivery (ESM/vendored) belongs to
 * the deferred packaging ADR. It is a `dependency` (not devDependency) because
 * the Clash parser needs it at runtime.
 */

import yaml from "js-yaml";

/**
 * Parse Clash YAML text into a plain JS object.
 * @param {string} input
 * @returns {any}
 * @throws {Error} on non-string input or invalid YAML (routes to recover()).
 */
export function loadClashYaml(input) {
  if (typeof input !== "string") {
    throw new Error("Clash decode: input must be a string (PARSE_MISSING_REQUIRED)");
  }
  try {
    return yaml.load(input);
  } catch (err) {
    throw new Error(`Clash decode: invalid YAML (PARSE_MISSING_REQUIRED): ${err instanceof Error ? err.message : String(err)}`);
  }
}
