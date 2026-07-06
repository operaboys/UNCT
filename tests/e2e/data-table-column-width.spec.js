/**
 * Real-browser regression test for the `.data-table` column-squish bug
 * (assets/css/theme.css, 2026-07-06) — reported as widespread across every
 * `.data-table` in both languages (fa/en) and both viewports (mobile/
 * desktop), so it was NOT an RTL or breakpoint-specific bug: the browser's
 * default `table-layout: auto` was fitting all columns inside the parent
 * container instead of letting `.table-scroll`'s already-existing
 * `overflow-x: auto` engage, so narrow columns (GeoIP, Port Check, ...)
 * collapsed until short header words wrapped letter-by-letter.
 *
 * The fix (`table-layout: fixed` + a real, column-count-proportional
 * `min-width` + `white-space: nowrap` on `th`) is verified two ways:
 *  1. Computed style: every key `<th>`'s real rendered width stays above a
 *     sane floor, and its height never exceeds a single text line (i.e. it
 *     never wrapped) — checked on the worst-case 12-column Node List table
 *     AND the 9-column Developer Console Performance Logs table, in BOTH
 *     languages.
 *  2. On a real 375px mobile viewport, the table's own scrollWidth exceeds
 *     its `.table-scroll` container's clientWidth (real horizontal
 *     overflow) rather than the columns being squeezed to fit — this is
 *     the exact "must scroll, not squish" acceptance criterion.
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

/** A single-line `<th>`'s real rendered height at this app's font-size
 * (11.5px) + `padding-block: 10px` top/bottom is ~36-40px in every browser
 * this suite runs against; a wrapped (2+ line) header pushes well past 50px
 * regardless of font-rendering differences, so 48px is a safe one-line-vs-
 * wrapped discriminator without hardcoding an exact pixel value. */
const MAX_SINGLE_LINE_HEIGHT = 48;

const NAV_LABEL = { en: "Subscription Center", fa: "مرکز اشتراک" };
const CONVERTER_LABEL = { en: "Converter", fa: "مبدل" };
const PARSE_LABEL = { en: "Parse", fa: "تجزیه" };
const DEVCONSOLE_LABEL = { en: "Developer Console", fa: "کنسول توسعه‌دهنده" };

for (const lang of /** @type {const} */ (["en", "fa"])) {
  test.describe(`.data-table column widths — lang=${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      if (lang === "fa") {
        await page.addInitScript(() => {
          localStorage.setItem("unct:language", JSON.stringify("fa"));
        });
      }
    });

    test(`Subscription Center Node List (12 columns): no header wraps, every header stays above the readable-width floor (desktop)`, async ({ page }) => {
      await page.goto("/index.html");
      await page.getByRole("button", { name: CONVERTER_LABEL[lang], exact: true }).click();
      await page.locator("textarea").first().fill(buildNodeList(5));
      await page.getByRole("button", { name: PARSE_LABEL[lang], exact: true }).click();
      await expect(page.getByRole("button", { name: PARSE_LABEL[lang], exact: true })).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: NAV_LABEL[lang], exact: true }).click();
      const nodeListTable = page.locator("[aria-label='Node List'] table, [aria-label='لیست نودها'] table").first();
      await expect(nodeListTable).toBeVisible();

      const headers = nodeListTable.locator("thead th");
      const count = await headers.count();
      expect(count).toBe(12);

      for (let i = 0; i < count; i++) {
        const th = headers.nth(i);
        const box = await th.boundingBox();
        if (!box) throw new Error(`Header ${i} has no bounding box`);
        // Never squeezed to an unreadable sliver -- the real bug's symptom.
        expect(box.width).toBeGreaterThan(30);
        // Never wrapped to 2+ lines.
        expect(box.height).toBeLessThan(MAX_SINGLE_LINE_HEIGHT);
      }
    });

    test(`Subscription Center Node List: real horizontal scroll (not column squish) on a 375px mobile viewport`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/index.html");
      await page.getByRole("button", { name: CONVERTER_LABEL[lang], exact: true }).click();
      await page.locator("textarea").first().fill(buildNodeList(5));
      await page.getByRole("button", { name: PARSE_LABEL[lang], exact: true }).click();
      await expect(page.getByRole("button", { name: PARSE_LABEL[lang], exact: true })).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: NAV_LABEL[lang], exact: true }).click();
      const scrollContainer = page.locator(".table-scroll").filter({ has: page.locator("table.data-table") }).first();
      await expect(scrollContainer).toBeVisible();

      const table = scrollContainer.locator("table.data-table").first();
      const headers = table.locator("thead th");
      const count = await headers.count();
      expect(count).toBe(12);

      // No header wraps even at 375px -- this is the literal "on mobile,
      // real horizontal scroll must be visible, NOT column squishing"
      // acceptance criterion.
      for (let i = 0; i < count; i++) {
        const box = await headers.nth(i).boundingBox();
        if (!box) throw new Error(`Header ${i} has no bounding box`);
        expect(box.height).toBeLessThan(MAX_SINGLE_LINE_HEIGHT);
      }

      const { scrollWidth, clientWidth } = await scrollContainer.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      // The table is genuinely wider than its viewport-bound container --
      // real horizontal overflow, not columns forced to fit.
      expect(scrollWidth).toBeGreaterThan(clientWidth);
    });

    test(`Developer Console Performance Logs (9 columns): no header wraps (desktop + mobile)`, async ({ page }) => {
      await page.goto("/index.html");
      // Performance Logs only renders once at least one node has been parsed
      // ("No nodes yet -- parse something on the Converter Screen first.").
      await page.getByRole("button", { name: CONVERTER_LABEL[lang], exact: true }).click();
      await page.locator("textarea").first().fill(buildNodeList(1));
      await page.getByRole("button", { name: PARSE_LABEL[lang], exact: true }).click();
      await expect(page.getByRole("button", { name: PARSE_LABEL[lang], exact: true })).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: DEVCONSOLE_LABEL[lang], exact: true }).click();

      const perfTable = page.locator(".data-table").filter({ hasText: lang === "en" ? "Pool" : "استخر" }).first();
      await expect(perfTable).toBeVisible();
      const headers = perfTable.locator("thead th");
      const count = await headers.count();
      expect(count).toBe(9);
      for (let i = 0; i < count; i++) {
        const box = await headers.nth(i).boundingBox();
        if (!box) throw new Error(`Header ${i} has no bounding box`);
        expect(box.height).toBeLessThan(MAX_SINGLE_LINE_HEIGHT);
      }

      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(100);
      for (let i = 0; i < count; i++) {
        const box = await headers.nth(i).boundingBox();
        if (!box) throw new Error(`Header ${i} has no bounding box (mobile)`);
        expect(box.height).toBeLessThan(MAX_SINGLE_LINE_HEIGHT);
      }
    });
  });
}
