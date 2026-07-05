/**
 * Real end-to-end coverage for the Node List's virtualization
 * (`ui/subscription/subscription-screen.tsx`'s `NodeTable`, doc 14 §1/§2,
 * 2026-07-05) — driven against the real built bundle (`assets/js/app.js`,
 * rebuilt by `npm run test:e2e`'s `pretest:e2e` hook) in a real Chromium,
 * not jsdom. Deliberately `.spec.js`, not `.test.js` — mirrors
 * `tests/e2e/subscription-merge.spec.js`'s pattern.
 *
 * This is the direct regression test for the real crash that triggered this
 * checkpoint: a user imported ~5000-6000 V2Ray/Trojan configs, opened
 * Subscription Center, and the tab fully crashed ("Aw, Snap!") because
 * `NodeTable` rendered every row with plain Preact `.map()`. This test
 * imports 5000 synthetic nodes (same order of magnitude) and proves three
 * things a crash-prone or half-fixed implementation could still fail on:
 *  1. The page does not crash and Subscription Center actually reaches a
 *     rendered, interactive state.
 *  2. It gets there in a reasonable time (seconds, not minutes).
 *  3. Scrolling is REAL: a middle-of-list node's address is absent from the
 *     DOM before scrolling (proving only a window of rows is mounted, not
 *     the whole 5000) and present after scrolling roughly halfway down the
 *     scroll container (proving the virtualized window actually tracks
 *     scroll position, not just the first render).
 */
import { test, expect } from "@playwright/test";

const NODE_COUNT = 5000;
const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

/** @param {number} count */
function buildSyntheticNodeList(count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const host = `host-${String(i).padStart(4, "0")}.example.com`;
    lines.push(`vless://${UUID}@${host}:443?security=tls&type=tcp&sni=${host}#node-${i}`);
  }
  return lines.join("\n");
}

test.describe("Subscription Center — Node List virtualization (5000+ nodes)", () => {
  test("imports 5000 nodes without crashing, renders in a reasonable time, and scrolling reaches real middle-of-list content", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/index.html");

    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildSyntheticNodeList(NODE_COUNT));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    // Waits for the real Worker-driven parse of 5000 nodes to finish — the
    // button reads "Parsing..." (a different accessible name) until then, so
    // this locator only resolves once parsing has actually completed.
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 60_000 });

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();

    // Proof #1: no crash — the Overview panel reaches "5000" (not a frozen
    // tab, not a truncated/failed import).
    await expect(page.locator('[aria-label="Overview"] dl dd').first()).toHaveText(String(NODE_COUNT), {
      timeout: 60_000,
    });
    const elapsedMs = Date.now() - startedAt;

    // Proof #2: reasonable render time — seconds, not minutes. Generous on
    // purpose (CI machines vary), but a real crash/freeze would blow well
    // past this regardless of machine speed.
    expect(elapsedMs).toBeLessThan(20_000);

    // Sort by Address ascending — deterministic order (host-0000 .. host-4999)
    // so "middle of the list" has a concrete, checkable meaning, independent
    // of whatever order the Worker-driven parse happened to append nodes in.
    // (`.field` wraps label text + the `<select>` itself, so the select's
    // accessible name includes its currently-selected option's text too —
    // `getByLabel(..., { exact: true })` can't match it; scope by the
    // wrapping `.field`'s text instead, same as `subscription-devconsole.spec.js`.)
    await page.locator(".field", { hasText: "Sort" }).locator("select").selectOption("address");
    await page.locator(".field", { hasText: "Direction" }).locator("select").selectOption("asc");
    await page.waitForTimeout(200);

    const scrollContainer = page.locator(".table-scroll--virtual").first();
    await expect(scrollContainer).toBeVisible();

    // Proof #3a: BEFORE scrolling, a real middle-of-list node (index ~2500)
    // is NOT in the DOM — only a small window of rows near the top is
    // mounted, not all 5000.
    await expect(page.locator(".data-table")).not.toContainText("host-2500.example.com");
    // The very first node (ascending sort by address) IS present — top of
    // the initial viewport.
    await expect(page.locator(".data-table")).toContainText("host-0000.example.com");

    // Scroll the virtualized container roughly to its midpoint.
    await scrollContainer.evaluate((el) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    });
    await page.waitForTimeout(300);

    // Proof #3b: AFTER scrolling halfway, real content from the middle band
    // of the list (index 2000-2999) is now present — the virtualized window
    // actually followed the scroll position, not just the initial render.
    await expect(page.locator(".data-table")).toContainText(/host-2\d{3}\.example\.com/);

    // The DOM never held the full 5000 rows at once — the crash-causing
    // pattern this checkpoint fixes is exactly that.
    const mountedRowCount = await page.locator(".data-table tbody tr").count();
    expect(mountedRowCount).toBeLessThan(NODE_COUNT / 2);
  });
});
