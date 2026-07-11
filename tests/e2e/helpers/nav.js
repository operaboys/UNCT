/**
 * Viewport-aware screen navigation for e2e tests (Liquid Glass v2 chrome):
 * on desktop the top pill nav has one button per screen; below the 760px
 * breakpoint that strip is `display: none` (out of the accessibility tree)
 * and navigation goes through either the floating dock directly (the 4
 * sections pinned there) or the dock's "More" bottom sheet (the other 4),
 * exactly like a real mobile user. The dock's last item is always "More"
 * (language-agnostic position).
 *
 * Subscription Center and Export Center use SHORTER labels in the dock
 * (`nav.subscriptionShort`/`nav.exportShort`) than their full nav label
 * (`nav.subscription`/`nav.export`, what every caller here passes) --
 * see ui/components/nav.tsx's DOCK_ITEMS. The "More" sheet only lists the
 * 4 sections NOT already in the dock, so those two full labels no longer
 * resolve to anything in the sheet; this table maps each mismatched full
 * label straight to its dock button instead. Dashboard/Converter need no
 * entry here since their dock label already equals their full label.
 */
/** @type {Record<string, string>} */
const DOCK_LABEL_OVERRIDES = {
  "Subscription Center": "Subscriptions",
  "Export Center": "Export",
  "مرکز اشتراک": "اشتراک‌ها",
  "مرکز خروجی": "خروجی",
};

/**
 * @param {import("@playwright/test").Page} page
 * @param {string} label - the screen's full nav label in the app's current language
 */
export async function gotoScreen(page, label) {
  const dock = page.locator(".mobile-dock");
  if (await dock.isVisible().catch(() => false)) {
    const dockLabel = DOCK_LABEL_OVERRIDES[label];
    if (dockLabel) {
      await dock.getByRole("button", { name: dockLabel, exact: true }).click();
      return;
    }
    await dock.locator(".mobile-dock__item").last().click();
    await page.getByRole("button", { name: label, exact: true }).click();
  } else {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
}
