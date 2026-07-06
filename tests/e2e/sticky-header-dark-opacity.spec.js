/**
 * Regression test for the dark-mode sticky-header overlap bug
 * (`assets/css/theme.css`'s `.table-scroll--virtual .data-table th`,
 * 2026-07-06 -- a real user confirmed by eye, twice, that scrolled-past row
 * text remained visible under the sticky header despite `backdrop-filter`
 * genuinely computing (verified with `getComputedStyle` in an earlier,
 * insufficient attempt). A careful scroll-position sweep with a tight,
 * high-DPI crop of exactly the `<th>`'s own bounding box proved the real
 * fix has to guarantee ZERO bleed-through, not just "probably good enough"
 * translucency + blur -- so dark mode now uses a fully OPAQUE background
 * (`rgb(53, 55, 58)`, the flattened equivalent of this file's own
 * established dark "control surface" tint) instead of a low-opacity wash.
 *
 * This test encodes the one property that provably eliminates the bug:
 * the header's rendered `background-color` alpha channel is exactly 1 in
 * dark mode -- translucency of ANY amount reintroduces the failure mode
 * regardless of blur radius (proven by the investigation above).
 */
import { test, expect } from "@playwright/test";

const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

/** @param {number} count */
function buildNodeList(count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const host = `host-${String(i).padStart(2, "0")}.example.com`;
    lines.push(`vless://${UUID}@${host}:443?security=tls&type=tcp&sni=${host}#node-${i}`);
  }
  return lines.join("\n");
}

test.describe("Dark Mode — sticky table header is fully opaque (no scroll-through bleed)", () => {
  test("background-color alpha is exactly 1, at a non-row-aligned scroll offset", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("unct:theme", JSON.stringify("dark")));
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildNodeList(30));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Developer Console", exact: true }).click();

    const scrollContainer = page.locator('[aria-label="Detection Logs"] .table-scroll--virtual').first();
    await scrollContainer.scrollIntoViewIfNeeded();
    // 20px -- deliberately NOT a multiple of the ~38px row height, the exact
    // kind of transitional offset that showed residual ghosting before this
    // fix (fully row-aligned offsets masked the bug in earlier, insufficient
    // verification passes).
    await scrollContainer.evaluate((el) => { el.scrollTop = 20; });

    const th = scrollContainer.locator("thead th").first();
    await expect(th).toBeVisible();
    const backgroundColor = await th.evaluate((el) => getComputedStyle(el).backgroundColor);

    const match = backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!match) throw new Error(`Unexpected backgroundColor format: ${backgroundColor}`);
    const parts = match[1].split(",").map((s) => Number(s.trim()));
    const alpha = parts.length === 4 ? parts[3] : 1;
    expect(alpha).toBe(1);
  });

  test("light mode is unaffected -- still the pre-existing translucent + blurred glass header", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildNodeList(30));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Developer Console", exact: true }).click();

    const scrollContainer = page.locator('[aria-label="Detection Logs"] .table-scroll--virtual').first();
    await scrollContainer.scrollIntoViewIfNeeded();
    const th = scrollContainer.locator("thead th").first();
    const style = await th.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { backgroundColor: cs.backgroundColor, backdropFilter: cs.backdropFilter };
    });

    const match = style.backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!match) throw new Error(`Unexpected backgroundColor format: ${style.backgroundColor}`);
    const parts = match[1].split(",").map((s) => Number(s.trim()));
    const alpha = parts.length === 4 ? parts[3] : 1;
    expect(alpha).toBeLessThan(1);
    expect(style.backdropFilter).toContain("blur");
  });
});
