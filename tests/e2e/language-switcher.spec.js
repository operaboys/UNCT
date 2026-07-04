/**
 * Real end-to-end coverage for the Settings Screen's new Language Engine
 * panel — driven against the real built bundle (`assets/js/app.js`,
 * rebuilt by `npm run test:e2e`'s `pretest:e2e` hook) in a real Chromium,
 * not jsdom. Deliberately `.spec.js`, not `.test.js` — mirrors every other
 * file in this directory.
 *
 * This is the first test that flips the language through the real user
 * path (clicking the "فارسی" radio card) rather than injecting
 * `localStorage["unct:language"]` before load (what `rtl-visual.spec.js`
 * does, since no UI switcher existed yet when that file was written) --
 * it proves `settingsStore.setLanguageChoice("fa")` really reaches
 * `<html dir/lang>` and re-renders the mounted screen's text live, with
 * no reload.
 */
import { test, expect } from "@playwright/test";

test.describe("Settings Screen — Language Engine", () => {
  test("clicking \"فارسی\" flips <html dir/lang> and the mounted screen's text live, no reload", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.locator(".screen-title")).toHaveText("Settings");
    await expect(page.getByText("Language", { exact: true }).first()).toBeVisible();

    await page.getByRole("radio", { name: "فارسی" }).check();

    // The real user path: a click on the radio, not a manual localStorage
    // injection -- confirms setLanguageChoice really reaches <html>.
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");

    // The still-mounted Settings Screen itself re-renders to Persian
    // immediately -- no navigation/reload needed.
    await expect(page.locator(".screen-title")).toHaveText("تنظیمات");
    await expect(page.getByText("درحال‌حاضر اعمال‌شده: فارسی")).toBeVisible();

    // Switching screens confirms the language choice persists app-wide,
    // not just on the screen where it was changed.
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await expect(page.locator(".screen-title")).toHaveText("مبدل");

    // Switching back to English un-flips both the attributes and the text.
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: "English" }).check();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".screen-title")).toHaveText("Settings");
  });
});
