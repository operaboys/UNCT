/**
 * Real-browser regression test for the QR Pagination mobile bug
 * (`ui/export/export-screen.tsx` + new `ui/export/qr-pagination.ts`,
 * 2026-07-06) — `.qr-grid`'s CSS Grid (`grid-template-columns:
 * repeat(auto-fit, minmax(160px, 1fr))`) renders only 1 real column on a
 * narrow mobile viewport, but the OLD fixed `QR_PAGE_SIZE = 24` meant a
 * mobile page still held 24 items -- 24 stacked single-column rows, a page
 * long enough that reaching "Next" required scrolling through the whole
 * thing, defeating pagination's entire point. The page size now comes from
 * `computeQrPageSize` (`ui/export/qr-pagination.ts`), driven by `.qr-grid`'s
 * real measured width (`useElementWidth`, a `ResizeObserver`) — this test
 * proves that translates into an actually-short page in a real browser, not
 * just correct arithmetic in isolation (`tests/ui/export/qr-pagination.test.js`
 * already covers the pure formula).
 */
import { test, expect } from "@playwright/test";

const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NODE_COUNT = 60;

/** @param {number} count */
function buildNodeList(count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const host = `host-${String(i).padStart(2, "0")}.example.com`;
    lines.push(`vless://${UUID}@${host}:443?security=tls&type=tcp&sni=${host}#node-${i}`);
  }
  return lines.join("\n");
}

/** @param {import("@playwright/test").Page} page */
async function importNodesAndOpenExport(page) {
  await page.goto("/index.html");
  await page.getByRole("button", { name: "Converter", exact: true }).click();
  await page.locator("textarea").first().fill(buildNodeList(NODE_COUNT));
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Export Center", exact: true }).click();
  const qrPanel = page.locator('[aria-label="QR Export"]');
  await expect(qrPanel.locator(".qr-card")).not.toHaveCount(0);
  return qrPanel;
}

test.describe("QR Pagination — page size reacts to real column count", () => {
  test("mobile (375px, 1 real column): a page is a handful of items, not 24 stacked rows", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const qrPanel = await importNodesAndOpenExport(page);

    // Real 1-column layout: every card's left edge lines up (no second
    // column) -- confirms the scenario this test targets is real.
    const cards = qrPanel.locator(".qr-card");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(1);
    const firstBox = await cards.first().boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    if (!firstBox || !secondBox) throw new Error("Expected visible QR cards");
    expect(firstBox.x).toBeCloseTo(secondBox.x, 0);

    // The literal bug: on mobile this used to always be 24. It must now be
    // a small, bounded number of rows (QR_ROWS_PER_PAGE from
    // qr-pagination.ts -- checked loosely here, precisely in the unit test).
    expect(cardCount).toBeLessThanOrEqual(6);

    // Multiple pages exist for 60 nodes at this page size -- pagination is
    // still real, just with a much shorter page.
    await expect(qrPanel).toContainText(/Page 1 of [2-9]|Page 1 of \d{2,}/);
  });

  test("desktop (wide viewport, multi-column): page size stays large -- no regression to prior behavior", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const qrPanel = await importNodesAndOpenExport(page);

    const cards = qrPanel.locator(".qr-card");
    const cardCount = await cards.count();

    // A wide desktop grid has several real columns -- the page holds
    // meaningfully more than the mobile 1-column page's handful of items.
    expect(cardCount).toBeGreaterThan(10);
  });

  test("rotating from mobile to a wider viewport grows the page size on the next measured render", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const qrPanel = await importNodesAndOpenExport(page);
    const mobileCount = await qrPanel.locator(".qr-card").count();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(200);
    const desktopCount = await qrPanel.locator(".qr-card").count();

    expect(desktopCount).toBeGreaterThan(mobileCount);
  });
});
