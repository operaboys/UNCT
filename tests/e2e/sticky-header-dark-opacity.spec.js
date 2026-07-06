/**
 * Regression test for the dark-mode sticky-header overlap bug
 * (`assets/css/theme.css`'s `.table-scroll--virtual .data-table th`,
 * 2026-07-06) and its two follow-up corrections:
 *
 * 1. First attempt: translucent white wash (matching `.glass-panel`'s own
 *    dark-mode convention) + `backdrop-filter: blur`. A real user confirmed
 *    by eye that scrolled-past row text still bled through legibly.
 * 2. Second attempt: went to the opposite extreme -- fully OPAQUE
 *    `rgb(53, 55, 58)`, zero `backdrop-filter` (dead at alpha=1). This
 *    provably killed all bleed-through, but the same user then correctly
 *    pointed out it also killed the Liquid Glass *feel* entirely -- a flat
 *    solid rectangle instead of frosted glass.
 * 3. THIS fix: a deliberate, tested balance -- `rgba(20, 22, 26, 0.97)` +
 *    real `backdrop-filter: blur(20px)`. A systematic scroll-sweep +
 *    forensic high-DPI crop test (documented in the CSS comment itself)
 *    showed NO translucent value fully eliminates bleed-through under
 *    active forensic zoom -- only alpha=1 can guarantee that -- but at any
 *    normal viewing scale, 0.97 reads as genuinely illegible AND keeps a
 *    real, visible soft blur gradient (unlike the flat solid version).
 *
 * These tests guard the two failure directions at once: dark mode must
 * stay meaningfully translucent (not regress back to the flat solid
 * rgb(53, 55, 58) from attempt 2) AND stay highly opaque (not regress back
 * to the too-transparent attempt-1 formula) -- both regressions are real,
 * already-shipped-and-reverted states in this exact file's history.
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

/** @param {import("@playwright/test").Locator} el */
async function readAlpha(el) {
  const backgroundColor = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
  const match = backgroundColor.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`Unexpected backgroundColor format: ${backgroundColor}`);
  const parts = match[1].split(",").map((s) => Number(s.trim()));
  return parts.length === 4 ? parts[3] : 1;
}

/** @param {import("@playwright/test").Page} page */
async function openDetectionLogsScrollContainer(page) {
  await page.goto("/index.html");
  await page.getByRole("button", { name: "Converter", exact: true }).click();
  await page.locator("textarea").first().fill(buildNodeList(30));
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Developer Console", exact: true }).click();
  const scrollContainer = page.locator('[aria-label="Detection Logs"] .table-scroll--virtual').first();
  await scrollContainer.scrollIntoViewIfNeeded();
  return scrollContainer;
}

test.describe("Dark Mode — sticky table header stays real translucent glass, not flat solid", () => {
  test("background-color alpha is high (>= 0.9) but genuinely translucent (< 1), with a real blur", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("unct:theme", JSON.stringify("dark")));
    const scrollContainer = await openDetectionLogsScrollContainer(page);
    // 20px -- deliberately NOT a multiple of the ~38px row height, the exact
    // kind of transitional offset that showed residual ghosting in attempt 1.
    await scrollContainer.evaluate((el) => { el.scrollTop = 20; });

    const th = scrollContainer.locator("thead th").first();
    await expect(th).toBeVisible();
    const alpha = await readAlpha(th);
    const backdropFilter = await th.evaluate((el) => getComputedStyle(el).backdropFilter);

    // Not attempt-2's flat solid regression (alpha === 1)...
    expect(alpha).toBeLessThan(1);
    // ...and not attempt-1's too-transparent regression either (legible bleed).
    expect(alpha).toBeGreaterThanOrEqual(0.9);
    // A real, non-dead blur -- proof this is still genuinely "glass".
    expect(backdropFilter).toContain("blur");
  });
});

test.describe("Light Mode — unaffected by the dark-mode-only changes above", () => {
  test("still the pre-existing translucent + blurred glass header", async ({ page }) => {
    const scrollContainer = await openDetectionLogsScrollContainer(page);
    const th = scrollContainer.locator("thead th").first();
    const alpha = await readAlpha(th);
    const backdropFilter = await th.evaluate((el) => getComputedStyle(el).backdropFilter);

    expect(alpha).toBeLessThan(1);
    expect(backdropFilter).toContain("blur");
  });
});
