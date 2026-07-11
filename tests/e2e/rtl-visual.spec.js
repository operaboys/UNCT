/**
 * Real-browser RTL/Persian verification (07-UI_UX_SYSTEM §9, ADR-019,
 * docs/architecture/RTL-GUIDELINES.md) — driven against the real built
 * bundle in a real Chromium, not jsdom. This is the committed, re-runnable
 * record of the manual Playwright check done ad hoc during the i18n content
 * pass (commit 1dcdd34); that check was never saved as a spec file, so it
 * could not be re-verified independently — this file closes that gap.
 *
 * `page.addInitScript` sets `unct:language` in `localStorage` (the exact
 * key/prefix `core/storage/local-adapter.js` uses, `DEFAULT_PREFIX = "unct:"`)
 * before any page script runs, so `core/store/settings-state.js` resolves
 * `resolvedLanguage: "fa"` from its very first read — the same effect a real
 * user gets from a persisted language choice. (A real Language Engine
 * switcher now exists in Settings too -- see `language-switcher.spec.js` for
 * the version of this check driven through an actual UI click instead.)
 */
import { test, expect } from "@playwright/test";

/**
 * `locator.boundingBox()` returns `null` for a detached/invisible element --
 * throwing here (instead of a bare non-null assertion) gives `tsc --noEmit`
 * real narrowing and fails the test with a clear message if a selector ever
 * stops matching, rather than an obscure "Cannot read properties of null".
 * @param {import("@playwright/test").Locator} locator
 * @returns {Promise<{ x: number, y: number, width: number, height: number }>}
 */
async function requireBoundingBox(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected a visible element with a bounding box");
  return box;
}

/**
 * Real Persian nav label (ui/components/nav.tsx now resolves through `t()` --
 * a later checkpoint un-deferred the "nav stays English" scope decision this
 * file's tests originally relied on) -> real Persian title text.
 */
const SCREENS = [
  { key: "dashboard", navLabel: "داشبورد", titleSelector: ".eyebrow", titleText: "نمای کلی داشبورد" },
  { key: "converter", navLabel: "مبدل", titleSelector: ".screen-title", titleText: "مبدل" },
  { key: "analyzer", navLabel: "تحلیل‌گر", titleSelector: ".screen-title", titleText: "تحلیل‌گر" },
  { key: "subscription", navLabel: "مرکز اشتراک", titleSelector: ".screen-title", titleText: "مرکز اشتراک" },
  { key: "extractor", navLabel: "استخراج‌کننده", titleSelector: ".screen-title", titleText: "استخراج‌کننده" },
  { key: "export", navLabel: "مرکز خروجی", titleSelector: ".screen-title", titleText: "مرکز خروجی" },
  { key: "settings", navLabel: "تنظیمات", titleSelector: ".screen-title", titleText: "تنظیمات" },
  { key: "devconsole", navLabel: "کنسول توسعه‌دهنده", titleSelector: ".screen-title", titleText: "کنسول توسعه‌دهنده" },
];

test.beforeEach(async ({ page }) => {
  // Force resolvedLanguage="fa" from the very first paint, the same way a
  // returning user with a persisted choice would get it (core/store/
  // settings-state.js reads this key once at store-creation time).
  await page.addInitScript(() => {
    localStorage.setItem("unct:language", JSON.stringify("fa"));
  });
});

test.describe("RTL — <html> attributes", () => {
  test("dir=\"rtl\" and lang=\"fa\" are applied on load", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  });
});

test.describe("RTL — every screen shows real Persian text, zero console errors", () => {
  for (const { key, navLabel, titleSelector, titleText } of SCREENS) {
    test(`${key} screen`, async ({ page }) => {
      /** @type {string[]} */
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      await page.goto("/index.html");
      // Dashboard is the app's default screen (ui/main.tsx's initial state) --
      // its own nav tab starts `disabled` (AppNav disables the active tab),
      // so it must not be clicked; every other screen needs the real click.
      if (key !== "dashboard") {
        await page.getByRole("button", { name: navLabel, exact: true }).click();
      }

      const title = page.locator(titleSelector).first();
      await expect(title).toHaveText(titleText);
      // Guards against a silent fallback-to-English-key regression: the
      // English source string must not appear where the Persian title goes.
      await expect(title).not.toHaveText(/^[A-Za-z]/);

      expect(pageErrors).toEqual([]);
    });
  }
});

test.describe("RTL — grid layouts mirror under dir=\"rtl\"", () => {
  test(".content-grid: first DOM child (Input Panel) renders on the physical right", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "مبدل", exact: true }).click();

    const children = page.locator(".content-grid").first().locator(":scope > *");
    const first = await requireBoundingBox(children.nth(0));
    const second = await requireBoundingBox(children.nth(1));

    // Same row (grid, not wrapped) -- a real mirroring assertion only holds
    // when both panels sit on the same visual row.
    expect(Math.abs(first.y - second.y)).toBeLessThan(5);
    // RTL Grid auto-placement puts DOM child #1 in column 1, which is the
    // *physically rightmost* column under dir="rtl" -- so its left edge
    // must be further right (bigger x) than the second child's.
    expect(first.x).toBeGreaterThan(second.x);
  });

  test(".panel-grid: first DOM child (Overview) renders on the physical right", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "مرکز اشتراک", exact: true }).click();

    const children = page.locator(".panel-grid").first().locator(":scope > *");
    const first = await requireBoundingBox(children.nth(0));
    const second = await requireBoundingBox(children.nth(1));

    expect(Math.abs(first.y - second.y)).toBeLessThan(5);
    expect(first.x).toBeGreaterThan(second.x);
  });

  test(".data-table: column order mirrors (first header renders on the physical right)", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "مبدل", exact: true }).click();
    await page.locator("textarea").first().fill(
      "vless://aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee@example.com:443?security=tls&type=tcp&sni=example.com#node-one",
    );
    await page.getByRole("button", { name: "تجزیه", exact: true }).click();

    const headers = page.locator(".data-table thead th");
    const firstHeader = await requireBoundingBox(headers.nth(0)); // Protocol column
    const secondHeader = await requireBoundingBox(headers.nth(1)); // Address column
    expect(firstHeader.x).toBeGreaterThan(secondHeader.x);
  });
});

test.describe("RTL — directional icon fix (this review's finding)", () => {
  test(".cta-arrow (Dashboard's \"See all\"/Quick Actions &rarr; glyphs) is horizontally mirrored", async ({ page }) => {
    await page.goto("/index.html"); // Dashboard is the default screen -- no click needed.

    const arrow = page.locator(".cta-arrow").first();
    await expect(arrow).toBeVisible();
    const transform = await arrow.evaluate((el) => getComputedStyle(el).transform);
    // `transform: scaleX(-1)` resolves to this 2D matrix -- confirms the
    // real mirroring rule (assets/css/theme.css `[dir="rtl"] .cta-arrow`)
    // is actually applied, not just present unused in the stylesheet.
    expect(transform).toBe("matrix(-1, 0, 0, 1, 0, 0)");
  });
});
