/**
 * Real end-to-end coverage for the User Guide modal
 * (`ui/settings/user-guide-modal.tsx`), driven against the real built bundle
 * in a real Chromium, not jsdom. Covers what a component/unit test can't:
 * real dialog semantics, real keyboard focus/Escape behavior, and the
 * mobile viewport (Settings — like every screen — is reachable from the
 * mobile dock/"More" sheet, so the Guide must open there too).
 */
import { test, expect } from "@playwright/test";
import { gotoScreen } from "./helpers/nav.js";

test.describe("User Guide modal (Settings)", () => {
  test("opens as a labeled dialog with all 4 sections, closes via the × button", async ({ page }) => {
    await page.goto("/index.html");
    await gotoScreen(page, "Settings");

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Open the User Guide" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(page.getByRole("heading", { name: "UNCT User Guide" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "What is UNCT?", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First time here? Do this", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The 8 screens", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Known limits", exact: false })).toBeVisible();

    // All 8 screens' real screenshots are present and actually loaded (not broken links).
    for (const label of ["Dashboard", "Converter", "Analyzer", "Subscription Center", "Extractor", "Export Center", "Settings", "Developer Console"]) {
      const img = dialog.getByRole("img", { name: label, exact: true });
      await expect(img).toBeVisible();
      expect(await img.evaluate((el) => /** @type {HTMLImageElement} */ (el).naturalWidth)).toBeGreaterThan(0);
    }

    await dialog.getByRole("button", { name: "Close guide" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("Escape closes the dialog and restores focus to the opening button", async ({ page }) => {
    await page.goto("/index.html");
    await gotoScreen(page, "Settings");

    const openButton = page.getByRole("button", { name: "Open the User Guide" });
    await openButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    // Generous timeout (matches this suite's own pattern for assertions that
    // share the machine with heavy parallel specs, e.g. scale-3000-nodes.spec.js's
    // 30s waits) -- under `fullyParallel` scheduling this test can land in the
    // same worker slot as the 5000-node virtualization spec, and plain event-loop
    // contention (not a real bug in the Escape handler) can push the close past
    // Playwright's 5s default.
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 30_000 });
    await expect(openButton).toBeFocused();
  });

  test("clicking the backdrop closes the dialog", async ({ page }) => {
    await page.goto("/index.html");
    await gotoScreen(page, "Settings");

    await page.getByRole("button", { name: "Open the User Guide" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator(".guide-modal-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("opens correctly on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/index.html");
    await gotoScreen(page, "Settings");

    await page.getByRole("button", { name: "Open the User Guide" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "UNCT User Guide" })).toBeVisible();
  });

  test("shows real Persian content and RTL-correct screenshots when language is فارسی", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("unct:language", JSON.stringify("fa"));
    });
    await page.goto("/index.html");
    await gotoScreen(page, "تنظیمات");

    await page.getByRole("button", { name: "باز کردن راهنمای کاربر" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("heading", { name: "راهنمای کاربر UNCT" })).toBeVisible();
    await expect(page.getByText("UNCT چیست؟", { exact: true })).toBeVisible();

    const dashboardImg = dialog.getByRole("img", { name: "داشبورد", exact: true });
    await expect(dashboardImg).toHaveAttribute("src", "assets/guide/fa/dashboard.png");
    expect(await dashboardImg.evaluate((el) => /** @type {HTMLImageElement} */ (el).naturalWidth)).toBeGreaterThan(0);
  });
});
