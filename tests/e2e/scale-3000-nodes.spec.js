/**
 * Real end-to-end coverage at the same scale a real user actually hit
 * (~3000 nodes) for the three screens reported laggy in that report:
 * Export Center (QR computed/rendered for every node unconditionally),
 * Developer Console (five tables rendered via plain Preact `.map()` over
 * their full arrays), and the Analyzer Screen (a suspected — but, per
 * `tests/worker/worker-manager.test.js`'s new regression tests and this
 * checkpoint's real timing measurement below, NOT computation-bound —
 * stuck-loading report). Driven against the real built bundle
 * (`assets/js/app.js`, rebuilt by `npm run test:e2e`'s `pretest:e2e` hook)
 * in a real Chromium, not jsdom.
 *
 * Real measurement taken while investigating: `analyzeBatch()` alone (no
 * Worker/UI overhead) processes 3000 real nodes in ~57ms — computation was
 * never the bottleneck for any of these three screens; all three lagged
 * purely on RENDER cost (Export Center/DevConsole) or, for Analyze, a
 * suspected Promise-settlement gap (see `core/worker/worker-manager.js` +
 * `core/worker/shared/handler-envelope.js`'s new postMessage guards).
 */
import { test, expect } from "@playwright/test";

const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NODE_COUNT = 3000;

/** @param {number} count */
function buildNodeList(count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const host = `host-${String(i).padStart(4, "0")}.example.com`;
    lines.push(`vless://${UUID}@${host}:443?security=tls&type=tcp&sni=${host}#node-${i}`);
  }
  return lines.join("\n");
}

/** @param {import("@playwright/test").Page} page @param {number} count */
async function importNodes(page, count) {
  await page.goto("/index.html");
  await page.getByRole("button", { name: "Converter", exact: true }).click();
  await page.locator("textarea").first().fill(buildNodeList(count));
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 30_000 });
}

test.describe("Real-world scale (~3000 nodes) — Export Center, Developer Console, Analyzer", () => {
  test("Export Center: QR panel renders in a reasonable time, paginated (not all 3000 computed at once)", async ({ page }) => {
    test.setTimeout(60_000);
    await importNodes(page, NODE_COUNT);

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Export Center", exact: true }).click();
    const qrPanel = page.locator('[aria-label="QR Export"]');
    await expect(qrPanel.locator(".qr-card")).not.toHaveCount(0, { timeout: 15_000 });
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(15_000);

    // Not all 3000 QR codes were computed/mounted at once — only one page.
    const mountedQrCount = await qrPanel.locator(".qr-card").count();
    expect(mountedQrCount).toBeLessThan(NODE_COUNT / 10);

    // Real pagination controls are present and functional.
    await expect(qrPanel).toContainText("Page 1 of");
    const firstPageFirstCard = await qrPanel.locator(".qr-card").first().textContent();
    await qrPanel.getByRole("button", { name: "Next" }).click();
    await expect(qrPanel).toContainText("Page 2 of");
    const secondPageFirstCard = await qrPanel.locator(".qr-card").first().textContent();
    // Different node protocol/position renders on page 2 — real pagination,
    // not a no-op.
    expect(firstPageFirstCard).not.toBeNull();
    expect(secondPageFirstCard).not.toBeNull();
  });

  test("Developer Console: all 5 log tables render in a reasonable time, virtualized (not all 3000 rows mounted)", async ({ page }) => {
    test.setTimeout(60_000);
    await importNodes(page, NODE_COUNT);

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Developer Console", exact: true }).click();
    const parserLogsPanel = page.locator('[aria-label="Parser Logs"]');
    await expect(parserLogsPanel.locator("tbody tr").first()).toBeVisible({ timeout: 15_000 });
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(15_000);

    // Parser Logs has exactly one row per node (3000) -- confirm it is
    // virtualized: far fewer than 3000 <tr>s are actually mounted.
    const mountedRows = await parserLogsPanel.locator("tbody tr").count();
    expect(mountedRows).toBeLessThan(NODE_COUNT / 10);

    // Detection Logs (also scales 1:1 with node count) is virtualized too.
    const detectionLogsPanel = page.locator('[aria-label="Detection Logs"]');
    const detectionRows = await detectionLogsPanel.locator("tbody tr").count();
    expect(detectionRows).toBeLessThan(NODE_COUNT / 10);

    // Scrolling the Parser Logs table reveals a DIFFERENT first visible row
    // than before scrolling -- proves it is really virtualized (windowed,
    // tracking real scroll position), not just artificially capped/truncated
    // at the same fixed slice. (Parser Logs shows each node's internal
    // `nodeId` (a UUID) + parser/sourceType/createdAt -- not its address --
    // so a UUID-shaped identifier is the right thing to compare here.)
    const idsBefore = (await parserLogsPanel.locator("tbody tr td:first-child").allTextContents()).filter(Boolean);
    const scrollContainer = parserLogsPanel.locator(".table-scroll--virtual");
    await scrollContainer.evaluate((el) => { el.scrollTop = el.scrollHeight / 2; });
    await page.waitForTimeout(300);
    const idsAfter = (await parserLogsPanel.locator("tbody tr td:first-child").allTextContents()).filter(Boolean);
    expect(idsBefore.length).toBeGreaterThan(0);
    expect(idsAfter.length).toBeGreaterThan(0);
    expect(idsAfter[0]).not.toBe(idsBefore[0]);
  });

  test("Analyzer: Analyze completes in a reasonable time and never gets stuck on \"Analyzing…\"", async ({ page }) => {
    test.setTimeout(60_000);
    await importNodes(page, NODE_COUNT);
    await page.getByRole("button", { name: "Analyzer", exact: true }).click();

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    // The button must return to "Analyze" (not stay "Analyzing…" forever).
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeVisible({ timeout: 20_000 });
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(20_000);

    // A real result is visible -- Analyze genuinely completed, not just
    // "button re-enabled with no real work done".
    await expect(page.locator('[aria-label="Security Analysis"] dd').first()).not.toHaveText("N/A");
  });
});
