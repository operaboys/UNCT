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
 *
 * Two follow-up fixes (real device testing, same day):
 * 1. `.app-nav` originally had FOUR direct flex children (brand, [tabs],
 *    language toggle, theme toggle) — `justify-content: space-between`
 *    distributes space between every one of them, not just "brand vs. the
 *    rest," so the language toggle landed stranded in the middle of the
 *    row instead of next to the theme toggle. The two toggle buttons are
 *    now wrapped in one `.app-nav__toggles` flex item, so `space-between`
 *    only ever has two things to split.
 * 2. The theme toggle's ☀/☾ glyphs are Emoji_Presentation=No by Unicode
 *    default, but many Android font-fallback stacks render them as full-
 *    color emoji anyway, ignoring the `color: #E8C56A` CSS entirely (shows
 *    solid black). Both glyphs now carry an explicit U+FE0E (VARIATION
 *    SELECTOR-15, "render as text") suffix to force the CSS-colorable
 *    glyph everywhere.
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
    // Bug #1 regression: the two toggles must sit right next to each
    // other, not stranded apart by a `space-between` with too many items.
    const [left, right] = [...toggleBoxes].sort((a, b) => a.x - b.x);
    expect(right.x - (left.x + left.width)).toBeLessThan(20);
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
    // RTL reverses the toggles' own internal (physical) order too, so sort
    // by x before measuring the gap between them, unlike the LTR case above
    // where DOM order already matches physical order.
    const [left, right] = [...toggleBoxes].sort((a, b) => a.x - b.x);
    expect(right.x - (left.x + left.width)).toBeLessThan(20);
  });

  test("Bug #2 regression: the theme toggle's sun/moon glyph carries an explicit text-presentation selector (U+FE0E)", async ({ page }) => {
    await page.goto("/index.html");

    const text = await page.locator(".app-nav__toggle--theme").first().textContent();
    expect(text).not.toBeNull();
    const codepoints = [...(text ?? "")].map((ch) => ch.codePointAt(0));
    // U+2600 (WHITE SUN WITH RAYS) or U+263E (LAST QUARTER MOON), immediately
    // followed by U+FE0E (VARIATION SELECTOR-15, "render as text, not emoji").
    expect(codepoints).toEqual([codepoints[0], 0xfe0e]);
    expect([0x2600, 0x263e]).toContain(codepoints[0]);
  });
});
