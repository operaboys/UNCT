/**
 * Real end-to-end investigation of the "Analyze sometimes gets stuck on
 * Analyzing..." report, following up on new device-level clues from the
 * user: Developer Console's Performance Logs showed the analyzer pool's
 * BUSY count stuck at 1 (not 0), the symptom correlated with switching
 * screens or reloading the page mid-Analyze (not just repeated clicking),
 * it sometimes self-resolved after an unusually long delay, and it was
 * markedly worse on desktop than mobile.
 *
 * `navigator.hardwareConcurrency`-driven pool sizing
 * (`core/worker/worker-manager.js#computePoolSize`) was the prime suspect
 * for the desktop-vs-mobile split, since desktop machines typically report
 * far more logical cores than phones. This file stubs
 * `hardwareConcurrency` to a high desktop-like value and drives the EXACT
 * navigate-away and hard-reload scenarios the clue pointed at, watching the
 * real, live Performance Logs BUSY count the user was reading from (not a
 * synthetic assertion) to confirm it always returns to a clean state.
 *
 * Code-level finding this test's scenarios are built around: neither
 * `analyzer-screen.tsx` nor `analyzer-worker-client.ts#analyzeNodesWith`
 * ever calls the underlying Job's `cancel()` on unmount (the manager's
 * `runJob()` return value's `.cancel` is discarded entirely) -- so an
 * in-flight Analyze genuinely keeps running in the background after the
 * user navigates away; only a NEW Analyze on the same track marks the old
 * one stale via `generationId`, matching doc 10 §6.1's own "Stale Jobs
 * must never update State" design (this is intentional auto-supersession,
 * not a bug by itself -- see the companion vitest suite in
 * `tests/worker/worker-manager.test.js`'s "Pool-Size-Dependent hypothesis"
 * block for the mechanism-level proof that a LARGE pool cannot itself
 * cause a permanent stuck slot).
 */
import { test, expect } from "@playwright/test";

const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NODE_COUNT = 3000; // wide enough to keep a real Analyze job in flight for a moment

/** @param {number} count */
function buildNodeList(count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const host = `host-${String(i).padStart(5, "0")}.example.com`;
    lines.push(`vless://${UUID}@${host}:443?security=tls&type=tcp&sni=${host}#node-${i}`);
  }
  return lines.join("\n");
}

/** @param {import("@playwright/test").Page} page */
async function stubDesktopHardwareConcurrency(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { value: 16, configurable: true });
  });
}

/** @param {import("@playwright/test").Page} page */
async function readAnalyzerBusyCount(page) {
  await page.getByRole("button", { name: "Developer Console", exact: true }).click();
  const row = page.locator('[aria-label="Performance Logs"] tbody tr', { hasText: "analyzer" });
  const busyText = await row.locator("td").nth(2).textContent();
  return Number(busyText);
}

test.describe("Analyze stuck-loading investigation — navigate/reload race, desktop-like large pool", () => {
  test("navigate away mid-Analyze then back and re-Analyze: analyzer pool BUSY always returns to 0, never stuck", async ({ page }) => {
    test.setTimeout(90_000);
    await stubDesktopHardwareConcurrency(page);
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildNodeList(NODE_COUNT));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    // Navigate away IMMEDIATELY -- no wait -- to land inside the real
    // in-flight window, exactly the "switch screens mid-Analyze" report.
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await page.waitForTimeout(50);

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeVisible({ timeout: 30_000 });

    // Give the (stale, abandoned) first Job's real response time to arrive
    // and free its slot, and the 1s-polling Performance Logs panel time to
    // pick up a fresh snapshot.
    await page.waitForTimeout(2_000);
    const busyCount = await readAnalyzerBusyCount(page);
    expect(busyCount).toBe(0);
  });

  test("hard full-page reload mid-Analyze: the new page's analyzer pool starts clean and a fresh Analyze completes normally", async ({ page }) => {
    test.setTimeout(90_000);
    await stubDesktopHardwareConcurrency(page);
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildNodeList(NODE_COUNT));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    // A real hard reload -- not SPA navigation -- destroys the whole old
    // Realm (and every Worker it owned) while a Job is still in flight.
    await page.reload();

    // The reloaded page starts with an empty Node List (ParserState is not
    // persisted across a hard reload in this app) -- re-import and Analyze
    // fresh to prove the NEW page's own analyzer pool works normally and
    // was never left in a broken state by the old page's abandoned Job.
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildNodeList(500));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[aria-label="Security Analysis"] dd').first()).not.toHaveText("N/A");

    await page.waitForTimeout(1_200);
    const busyCount = await readAnalyzerBusyCount(page);
    expect(busyCount).toBe(0);
  });
});
