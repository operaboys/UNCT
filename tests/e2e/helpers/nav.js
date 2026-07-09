/**
 * Viewport-aware screen navigation for e2e tests (Liquid Glass v2 chrome):
 * on desktop the top pill nav has one button per screen; below the 760px
 * breakpoint that strip is `display: none` (out of the accessibility tree)
 * and navigation goes through the floating dock's "More" bottom sheet,
 * exactly like a real mobile user. The dock's last item is always "More"
 * (language-agnostic position), and the sheet lists all 8 sections under
 * their full accessible names.
 */

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} label - the screen's full nav label in the app's current language
 */
export async function gotoScreen(page, label) {
  const dock = page.locator(".mobile-dock");
  if (await dock.isVisible().catch(() => false)) {
    await dock.locator(".mobile-dock__item").last().click();
    await page.getByRole("button", { name: label, exact: true }).click();
  } else {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
}
