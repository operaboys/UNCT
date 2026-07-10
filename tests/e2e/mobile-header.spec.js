/**
 * Regression test for the mobile header cleanup (<760px): the top bar
 * (brand lockup + language/theme quick-toggle buttons) used to keep the
 * full `.app-nav.glass-panel` pill chrome even after the tab strip itself
 * moved to the floating bottom dock — a glass capsule wrapped around just
 * two icons read as an odd floating box. Below 760px the glass background/
 * border/shadow are now dropped from `.app-nav` (brand + toggles render
 * directly on the page background), the row becomes `justify-content:
 * space-between` (brand at the writing-direction start, toggles at the
 * end — this is already direction-aware, so it mirrors under `dir="rtl"`
 * with no extra rule), and the two toggle buttons grow to the 44x44px
 * touch-target floor. Desktop's `.app-nav` (the real tab-strip pill) is
 * untouched — this is a mobile-only `@media (max-width: 760px)` override.
 */
import { test, expect } from "@playwright/test";

test.describe("Mobile header (<760px) — glass panel removed, space-between, touch targets", () => {
  test("drops the glass-panel chrome (background/border/shadow) from .app-nav on mobile only", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html");

    const style = await page.locator(".app-nav").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { background: cs.backgroundColor, backdropFilter: cs.backdropFilter, boxShadow: cs.boxShadow, borderWidth: cs.borderTopWidth };
    });
    expect(style.background).toBe("rgba(0, 0, 0, 0)");
    expect(style.boxShadow).toBe("none");
    expect(style.borderWidth).toBe("0px");
  });

  test("keeps the glass-panel chrome on desktop (>760px) -- unaffected by the mobile-only override", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/index.html");

    const style = await page.locator(".app-nav").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { background: cs.backgroundColor, boxShadow: cs.boxShadow };
    });
    expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.boxShadow).not.toBe("none");
  });

  test("English (LTR): brand renders before the toggle buttons; both toggles meet the 44x44 touch-target floor", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html");

    const brandBox = await page.locator(".app-nav__brand").boundingBox();
    const toggleBoxes = await page.locator(".app-nav__toggle").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()),
    );
    if (!brandBox) throw new Error("brand has no bounding box");
    expect(toggleBoxes).toHaveLength(2);
    for (const box of toggleBoxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    // LTR: brand sits physically left of both toggle buttons.
    expect(brandBox.x).toBeLessThan(toggleBoxes[0].x);
    expect(brandBox.x).toBeLessThan(toggleBoxes[1].x);
  });

  test("Persian (RTL): the same layout mirrors -- brand renders after the toggle buttons physically", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("unct:language", JSON.stringify("fa"));
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const brandBox = await page.locator(".app-nav__brand").boundingBox();
    const toggleBoxes = await page.locator(".app-nav__toggle").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()),
    );
    if (!brandBox) throw new Error("brand has no bounding box");
    for (const box of toggleBoxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    // RTL mirror: brand (reading-start = physical right) sits to the right
    // of both toggle buttons (reading-end = physical left) -- the opposite
    // of the LTR case above, with no separate RTL-only CSS rule needed.
    expect(brandBox.x).toBeGreaterThan(toggleBoxes[0].x);
    expect(brandBox.x).toBeGreaterThan(toggleBoxes[1].x);
  });
});
