/**
 * Real end-to-end coverage for Subscription Center's "Merge Subscription"
 * panel (doc 03 §2.2 / doc 07 §4.4) — driven against the real built bundle
 * (`assets/js/app.js`, rebuilt by `npm run test:e2e`'s `pretest:e2e` hook)
 * in a real Chromium, not jsdom. Deliberately `.spec.js`, not `.test.js` —
 * mirrors `tests/e2e/subscription-summary.spec.js`'s pattern.
 *
 * Merge reuses `ui/store/parser-worker-client.js#parseRawConfig` (the exact
 * same Worker-first pipeline the Converter Screen drives) and
 * `parserStore.addNode` (append, not `setNodes`'s replace) — this test
 * proves both real properties end to end:
 *  1. A successful Merge ADDS to the existing working Node List rather than
 *     replacing it (the original node imported via the Converter Screen
 *     must still be present afterward).
 *  2. An Unknown Format Merge attempt shows a real error message and
 *     leaves the existing Node List completely untouched (no crash, no
 *     silent data loss).
 */
import { test, expect } from "@playwright/test";

const UUID_A = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NODE_A = `vless://${UUID_A}@first.example.com:443?security=tls&type=tcp&sni=first.example.com#node-A`;
const NODE_B = "trojan://secretpass@second.example.com:443?security=tls&type=tcp&sni=second.example.com#node-B";

test.describe("Subscription Center — Merge Subscription", () => {
  test("merging a second config ADDS to the existing Node List, not replaces it", async ({ page }) => {
    await page.goto("/index.html");

    // Import the first node via the Converter Screen (the app's normal import path).
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(NODE_A);
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    await expect(page.locator('[aria-label="Overview"] dl dd').first()).toHaveText("1");

    const mergePanel = page.locator('[aria-label="Merge Subscription"]');
    await mergePanel.locator("textarea").fill(NODE_B);
    await mergePanel.getByRole("button", { name: "Import & Merge" }).click();
    await page.waitForTimeout(400);

    // Total Nodes must now be 2 — the second node was ADDED.
    await expect(page.locator('[aria-label="Overview"] dl dd').first()).toHaveText("2");
    // The real "added" confirmation message renders.
    await expect(mergePanel).toContainText("Added");
    // The ORIGINAL node's address is still present — proves append, not replace.
    await expect(page.locator(".data-table")).toContainText("first.example.com");
    await expect(page.locator(".data-table")).toContainText("second.example.com");
  });

  test("an Unknown Format merge attempt shows a real error and leaves the existing Node List untouched", async ({ page }) => {
    await page.goto("/index.html");

    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(NODE_A);
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    await expect(page.locator('[aria-label="Overview"] dl dd').first()).toHaveText("1");

    const mergePanel = page.locator('[aria-label="Merge Subscription"]');
    await mergePanel.locator("textarea").fill("not a config at all, just prose");
    await mergePanel.getByRole("button", { name: "Import & Merge" }).click();
    await page.waitForTimeout(400);

    // A real, visible error — not silence, not a crash.
    await expect(mergePanel.locator(".alert--error")).toBeVisible();
    // The existing Node List is completely untouched (still 1, not 0 or crashed).
    await expect(page.locator('[aria-label="Overview"] dl dd').first()).toHaveText("1");
    await expect(page.locator(".data-table")).toContainText("first.example.com");
  });
});
