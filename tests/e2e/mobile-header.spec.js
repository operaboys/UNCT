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
 * 2. (Superseded by fix 3.) The theme toggle's ☀/☾ glyphs are
 *    Emoji_Presentation=No by Unicode default, but many Android font-
 *    fallback stacks render them as full-color emoji anyway, ignoring the
 *    `color: #E8C56A` CSS entirely (shows solid black). Both glyphs were
 *    given an explicit U+FE0E (VARIATION SELECTOR-15, "render as text")
 *    suffix to force the CSS-colorable glyph everywhere.
 * 3. Fix 2 turned out insufficient: real-device testing found the icon
 *    still turning black, but only AFTER the first theme switch, on both
 *    mobile and desktop. Root cause was never the font: `.app-nav__toggle
 *    :hover { color: var(--unct-text); }` (two class selectors, specificity
 *    0,2,0) beats `.app-nav__toggle--theme { color: #E8C56A; }` (one class
 *    selector, 0,1,0), so the gold color always lost the cascade to the
 *    muted-text hover color as soon as the button was `:hover`ed -- and a
 *    mouse cursor left resting on the button right after a click (or a
 *    mobile browser's "sticky hover" after a tap, which persists until you
 *    tap elsewhere) IS a `:hover`ed state, reproducing from the very first
 *    switch on both form factors. The Unicode glyph + U+FE0E is now gone
 *    entirely, replaced by an inline SVG (`ThemeIcon` in
 *    ui/components/nav.tsx) whose `stroke="#E8C56A"` is a literal SVG
 *    attribute, never the CSS `color` property -- no `:hover` rule (or
 *    font-fallback) can touch it again.
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

  /** @type {Array<[string, { width: number, height: number }]>} */
  const viewportsByLabel = [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1280, height: 900 }],
  ];
  for (const [label, viewport] of viewportsByLabel) {
    test(`Bug #2 regression (${label}): the theme icon stays gold even while :hover'ed right after a theme switch`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/index.html");

      const toggle = page.locator(".app-nav__toggle--theme").first();
      // The icon must be a real SVG, not a font glyph -- font-fallback/
      // emoji-presentation bugs can't happen if there's no font involved.
      await expect(toggle.locator("svg")).toHaveCount(1);
      await expect(toggle.locator("svg circle, svg path")).not.toHaveCount(0);

      // Clicking the toggle both performs the theme switch AND leaves the
      // mouse cursor resting on the button -- the exact `:hover`ed state
      // that exposed the real bug (a mobile tap produces the same "sticky
      // hover" state on many browsers). Check it twice (light->dark->light)
      // so both the sun and moon variant are covered.
      for (let i = 0; i < 2; i += 1) {
        await toggle.click();
        const result = await toggle.evaluate((el) => {
          const svg = el.querySelector("svg");
          if (!svg) throw new Error("theme toggle has no <svg> icon");
          return {
            isHovered: el.matches(":hover"),
            svgStroke: getComputedStyle(svg).stroke,
          };
        });
        expect(result.isHovered).toBe(true);
        // #E8C56A == rgb(232, 197, 106) -- must hold even while hovered.
        expect(result.svgStroke).toBe("rgb(232, 197, 106)");
      }
    });
  }
});
