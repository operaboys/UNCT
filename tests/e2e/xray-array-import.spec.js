/**
 * Real end-to-end coverage for the Xray Parser's root-level Array fix
 * (`core/parser/xray/detect.js` + `extract.js`) — driven against the real
 * built bundle (`assets/js/app.js`, rebuilt by `npm run test:e2e`'s
 * `pretest:e2e` hook) in a real Chromium, not jsdom.
 *
 * The real bug: a user's exported file was a JSON ARRAY of ~1500-2000
 * complete Xray config documents (v2rayN's export shape) — the Xray Parser
 * only recognized a single Xray document at the JSON root, so this always
 * scored 0 ("Unknown Format"). This test proves the full real pipeline
 * end-to-end at the same order of magnitude the user actually hit: real
 * Worker-driven parse of the array (not just the pure-function scale proof
 * in `tests/regression/xray-array-export.test.js`) AND real Virtual List
 * rendering of the result (the same crash-prone render path
 * `tests/e2e/subscription-virtual-list.spec.js` covers for individually
 * pasted nodes) — both stages, back to back, on one real import.
 */
import { test, expect } from "@playwright/test";

const DOC_COUNT = 1500;
const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

/** @param {number} count */
function buildV2rayNArrayExport(count) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    const host = `xray-doc-${String(i).padStart(4, "0")}.example.com`;
    docs.push({
      log: { loglevel: "warning" },
      outbounds: [
        {
          protocol: "vless",
          tag: `proxy-${i}`,
          settings: {
            vnext: [{ address: host, port: 443, users: [{ id: UUID, encryption: "none" }] }],
          },
          streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: host } },
        },
        { protocol: "freedom", tag: "direct" },
      ],
    });
  }
  return JSON.stringify(docs);
}

test.describe("Converter + Subscription Center — Xray root-level Array export (real-world scale)", () => {
  test("parses a real-scale v2rayN array export (no 'Unknown Format'), and Virtual List renders the result without crashing", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildV2rayNArrayExport(DOC_COUNT));

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    // Waits for the real Worker-driven parse to finish (button text reverts
    // from "Parsing..." to "Parse", a different accessible name meanwhile).
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 60_000 });

    // Proof #1: this is NOT "Unknown Format" — a real detected parser name
    // shows, not a parse error.
    await expect(page.locator(".alert--error")).toHaveCount(0);
    await expect(page.locator('[aria-label="Parser Preview"] dl dd').first()).toHaveText("xray", { timeout: 10_000 });

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();

    // Proof #2: every document's real proxy outbound became a real node —
    // not 0 (Unknown Format), not silently truncated.
    await expect(page.locator('[aria-label="Overview"] dl dd').first()).toHaveText(String(DOC_COUNT), {
      timeout: 60_000,
    });
    const elapsedMs = Date.now() - startedAt;

    // Reasonable = seconds, not minutes (covers BOTH the real Worker parse
    // and the initial Virtual List render, back to back).
    expect(elapsedMs).toBeLessThan(30_000);

    // Proof #3: Virtual List (the earlier crash-fix checkpoint) renders this
    // real Xray-array-derived data without crashing — only a window of rows
    // is mounted, not all 1500.
    const scrollContainer = page.locator(".table-scroll--virtual").first();
    await expect(scrollContainer).toBeVisible();
    const mountedRowCount = await page.locator(".data-table tbody tr").count();
    expect(mountedRowCount).toBeLessThan(DOC_COUNT / 2);

    // Real content is really there — not blank/placeholder rows. (Default
    // sort is by import time, all identical in this batch, so which specific
    // document lands in the initial viewport is not guaranteed — any real
    // `xray-doc-NNNN` address proves the row content is genuine.)
    await expect(page.locator(".data-table")).toContainText(/xray-doc-\d{4}\.example\.com/);
  });
});
