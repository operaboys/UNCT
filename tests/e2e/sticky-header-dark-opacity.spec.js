/**
 * Regression test for the dark-mode sticky-header overlap bug
 * (`assets/css/theme.css`'s `.table-scroll--virtual .data-table th`,
 * 2026-07-06/07) and its follow-up corrections:
 *
 * 1. First attempt: translucent white wash + `blur`. Still bled through.
 * 2. Second attempt: fully OPAQUE, zero blur. Killed bleed-through but also
 *    killed the Liquid Glass *feel* -- a flat solid rectangle.
 * 3. Third attempt: `rgba(20, 22, 26, 0.97)` + `blur(20px)`, tuned by
 *    judging legibility on Developer Console data that (unknown at the
 *    time) was ALSO wrapping onto 2 lines from an unrelated `.data-table`
 *    column-width bug -- so a wrapped row's second line sat entirely
 *    outside the header's coverage, fully legible regardless of this
 *    rule's opacity, which made every opacity below 0.97 look like it was
 *    failing when the real defect was the wrap, not the blur.
 * 4. THIS fix (once the real row-wrap bug was found and fixed elsewhere):
 *    re-tested on genuinely single-line rows, at real 1x viewing scale.
 *    Light Mode's own shipping formula (`rgba(255,255,255,0.42)` +
 *    `blur(16px)`, unchanged) shows the same soft, blurred, partially-
 *    legible-if-you-focus ghosting at a mid-scroll position -- and a real
 *    user confirmed that IS what "blur" should look like: partial
 *    obscuring via real blur, not full opaque coverage. Dark Mode now
 *    mirrors Light Mode's own alpha/blur instead of a separately-tuned,
 *    much heavier one.
 *
 * These tests guard both failure directions: dark mode must stay
 * meaningfully translucent (not regress to the flat solid rgb(53,55,58)
 * from attempt 2) AND must not regress back to the much heavier 0.97+
 * opacity from attempt 3, which no longer matches Light Mode's own
 * character.
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
  test("background-color mirrors Light Mode's own alpha/blur -- a real dark tint, genuinely translucent, not the old near-opaque 0.97", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("unct:theme", JSON.stringify("dark")));
    const scrollContainer = await openDetectionLogsScrollContainer(page);
    // 20px -- deliberately NOT a multiple of the ~38px row height, the exact
    // kind of transitional offset that showed residual ghosting in attempt 1.
    await scrollContainer.evaluate((el) => { el.scrollTop = 20; });

    const th = scrollContainer.locator("thead th").first();
    await expect(th).toBeVisible();
    const alpha = await readAlpha(th);
    const backgroundColor = await th.evaluate((el) => getComputedStyle(el).backgroundColor);
    const backdropFilter = await th.evaluate((el) => getComputedStyle(el).backdropFilter);

    // Not attempt-2's flat solid regression (alpha === 1)...
    expect(alpha).toBeLessThan(1);
    // ...and not attempt-3's much heavier near-opaque regression (0.97).
    // Above Light Mode's own 0.42 (a deliberate user-requested bump,
    // 0.55 then 0.65 then 0.75) -- still real translucent glass, not a
    // solid block.
    expect(alpha).toBeCloseTo(0.80, 1);
    // A real dark tint (not attempt-1's white wash on a dark background).
    const numbers = backgroundColor.match(/\d+/g);
    if (!numbers) throw new Error(`Unexpected backgroundColor format: ${backgroundColor}`);
    expect(Number(numbers[0])).toBeLessThan(50);
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
