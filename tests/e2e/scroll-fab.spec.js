/**
 * Real-browser coverage for the shared Scroll-to-Top/Bottom FAB
 * (`ui/components/scroll-fab.tsx`, mounted once in `ui/main.tsx`'s shared
 * shell). Covers exactly the behaviors the task demanded real visual proof
 * for: hidden on a short page, visible with the correct arrow direction on
 * a genuinely long one, and that clicking actually scrolls.
 *
 * "Short page" reference screen changed from Settings to Analyzer
 * (2026-07-09, ADR-030): Settings gained three toggle rows + a Data row and
 * is now taller than the viewport on its own, so it stopped being a valid
 * "no scroll" example — Analyzer's pre-Analyze empty state is still exactly
 * one viewport tall.
 */
import { test, expect } from "@playwright/test";

/** @param {number} count */
function buildNodeList(count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const host = `host-${String(i).padStart(3, "0")}.example.com`;
    lines.push(
      `vless://aaaaaaaa-bbbb-4ccc-8ddd-${String(i).padStart(12, "0")}@${host}:443?security=tls&type=tcp&sni=${host}#node-${i}`,
    );
  }
  return lines.join("\n");
}

test.describe("Scroll-to-Top/Bottom FAB", () => {
  test("hidden on a short page (Analyzer), visible with correct arrow direction on a long one (Subscription Center)", async ({ page }) => {
    await page.goto("/index.html");

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await expect(page.locator(".scroll-fab")).toHaveCount(0);

    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildNodeList(300));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    const fab = page.locator(".scroll-fab");
    await expect(fab).toBeVisible();
    await expect(fab).toHaveText("↓");
    await expect(fab).toHaveAttribute("aria-label", "Scroll to bottom");

    // Fixed at the physical bottom-left corner.
    const box = await fab.boundingBox();
    if (!box) throw new Error("FAB has no bounding box");
    expect(box.x).toBeLessThan(100);
    const viewport = page.viewportSize();
    expect(box.y).toBeGreaterThan((viewport?.height ?? 0) - 100);

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect(fab).toHaveText("↑");
    await expect(fab).toHaveAttribute("aria-label", "Scroll to top");

    await fab.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBe(0);
    await expect(fab).toHaveText("↓");
  });

  test("scrolls instantly (no smooth animation) when prefers-reduced-motion is set", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildNodeList(300));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    const fab = page.locator(".scroll-fab");
    await fab.click();
    // A real smooth scroll of this distance takes well over 50ms; landing
    // at 0 almost immediately is only possible if it was instant.
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await context.close();
  });
});
