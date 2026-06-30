/**
 * Architecture Guard — ADR-024 §Enforcement
 *
 * The core pipeline (parser → UNM → analyzer/converter/validator) must NEVER
 * make network requests. This test enforces that invariant mechanically by
 * scanning every .js file in the five protected directories and failing if any
 * file contains a network-access pattern.
 *
 * Patterns checked:
 *   - fetch(          — Fetch API calls
 *   - XMLHttpRequest  — XHR constructor / usage
 *   - from "…/network/…" — imports from core/network/ (the designated
 *                          optional-online-features module, ADR-024)
 *
 * If any of these appear, move the code to core/network/ and wire it through
 * a user-initiated action in the UI layer (ADR-024 Rule 1).
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

/** Directories where network access is permanently forbidden. */
const PROTECTED_DIRS = [
  "core/parser",
  "core/analyzer",
  "core/converter",
  "core/validator",
  "core/unm",
];

/**
 * Patterns whose presence in a source file constitutes an ADR-024 violation.
 * These match live code; relative-path imports of core/network/ are caught by
 * the third pattern regardless of nesting depth.
 */
const FORBIDDEN = [
  {
    name: "fetch() — Fetch API",
    // \b prevents matching identifiers like "prefetch(" or "mockFetch("
    pattern: /\bfetch\s*\(/,
  },
  {
    name: "XMLHttpRequest",
    pattern: /\bXMLHttpRequest\b/,
  },
  {
    name: 'import from core/network/ (e.g. from "../network/latency.js")',
    // Matches any ES import whose path string contains "/network/" as a
    // directory segment — this covers all relative depths.
    pattern: /from\s+['"][^'"]*\/network\/[^'"]*['"]/,
  },
];

/** @param {string} dir */
function collectJsFiles(dir) {
  /** @type {string[]} */
  const result = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return result; // directory does not exist yet — silently skip
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      result.push(full);
    }
  }
  return result;
}

// Build the full file list once at module-load time so Vitest can enumerate
// the test cases before running any of them.
/** @type {Array<{ rel: string; abs: string }>} */
const allFiles = PROTECTED_DIRS.flatMap((relDir) =>
  collectJsFiles(join(ROOT, relDir)).map((abs) => ({
    abs,
    rel: abs.slice(ROOT.length + 1), // e.g. "core/parser/url/extract.js"
  })),
);

describe("Architecture Guard — no network access in core pipeline (ADR-024)", () => {
  if (allFiles.length === 0) {
    it("(no .js files found in protected directories — passes by default)", () => {
      // Nothing to check yet. Will become meaningful once Phase 2 files land.
    });
  }

  for (const { rel, abs } of allFiles) {
    it(`${rel} — must not contain network-access patterns`, () => {
      const src = readFileSync(abs, "utf-8");

      for (const { name, pattern } of FORBIDDEN) {
        expect(
          src,
          `\n[ADR-024 violation] ${rel}\nForbidden pattern detected: ${name}\n` +
            `Move network code to core/network/ and invoke it from a user-initiated UI action.`,
        ).not.toMatch(pattern);
      }
    });
  }
});
