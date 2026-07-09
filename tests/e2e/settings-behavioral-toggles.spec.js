/**
 * Real end-to-end coverage for ADR-030's three Settings Behavioral Toggles
 * (Strict Validation, Auto-repair, Deduplicate on import) and the Wipe Data
 * action, driven against the real built bundle (`assets/js/app.js`, rebuilt
 * by `npm run test:e2e`'s `pretest:e2e` hook) in a real Chromium, not jsdom.
 *
 * Auto-repair's own behavior (`core/validator/derive-status.js`) is already
 * fully covered by `tests/validator/derive-status.test.js` (13 unit tests,
 * both toggle states) — constructing a real config that trips a parser's
 * `recover()` path through the actual textarea would duplicate that same
 * coverage at far higher cost for no new signal, so this file exercises the
 * two toggles whose effect is only visible end-to-end: Strict Validation
 * (a UI tag) and Deduplicate on import (an import-time node count).
 */
import { test, expect } from "@playwright/test";
import { gotoScreen } from "./helpers/nav.js";

const UUID = "b831381d-6324-4d53-ad4f-8cda48b30811";
// security=tls with no `sni` param -> VAL_TLS_NO_SNI (warning severity,
// core/validator/validate-node.js) -> "warning" status by default, flips to
// "rejected" when Strict Validation is on (ADR-030 Decision 1).
const TLS_NO_SNI_NODE = `vless://${UUID}@example.com:443?security=tls&type=tcp#no-sni-node`;

test.describe("Settings Screen — ADR-030 behavioral toggles", () => {
  test("shows Strict Validation, Auto-repair, Deduplicate, and Data rows — no Telemetry row", async ({ page }) => {
    await page.goto("/index.html");
    await gotoScreen(page, "Settings");

    await expect(page.getByText("Strict validation", { exact: true })).toBeVisible();
    await expect(page.getByText("Auto-repair", { exact: true })).toBeVisible();
    await expect(page.getByText("Deduplicate on import", { exact: true })).toBeVisible();
    await expect(page.getByText("Data", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Wipe all data" })).toBeVisible();

    await expect(page.getByText("Telemetry", { exact: false })).toHaveCount(0);

    // Documented defaults (ADR-030): strict off, repair on, dedupe on.
    await expect(page.getByRole("checkbox", { name: "Strict validation" })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Auto-repair" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Deduplicate on import" })).toBeChecked();
  });

  test("Strict Validation flips a validation-warning node's tag between Warning and Rejected, reversibly", async ({ page }) => {
    await page.goto("/index.html");
    await gotoScreen(page, "Converter");
    await page.locator("textarea").first().fill(TLS_NO_SNI_NODE);
    await page.getByRole("button", { name: "Parse", exact: true }).click();

    await gotoScreen(page, "Subscription Center");
    await expect(page.locator(".tag--warning")).toHaveText("Warning");
    await expect(page.locator(".tag--invalid")).toHaveCount(0);

    await gotoScreen(page, "Settings");
    await page.getByRole("checkbox", { name: "Strict validation" }).check();

    await gotoScreen(page, "Subscription Center");
    await expect(page.locator(".tag--invalid")).toHaveText("Rejected");
    await expect(page.locator(".tag--warning")).toHaveCount(0);

    // Reversible: the same, untouched node reads back as "Warning" the
    // instant the toggle flips off again — no re-parse needed (ADR-030).
    await gotoScreen(page, "Settings");
    await page.getByRole("checkbox", { name: "Strict validation" }).uncheck();

    await gotoScreen(page, "Subscription Center");
    await expect(page.locator(".tag--warning")).toHaveText("Warning");
  });

  test("Deduplicate on import merges identical nodes by default, and stops merging when turned off", async ({ page }) => {
    const duplicatePair = [
      `vless://${UUID}@dup.example.com:443?security=tls&sni=dup.example.com&type=tcp#node-a`,
      `vless://${UUID}@dup.example.com:443?security=tls&sni=dup.example.com&type=tcp#node-b`,
    ].join("\n");

    await page.goto("/index.html");
    await gotoScreen(page, "Converter");
    await page.locator("textarea").first().fill(duplicatePair);
    await page.getByRole("button", { name: "Parse", exact: true }).click();

    await gotoScreen(page, "Dashboard");
    await expect(page.locator(".stat-value").first()).toHaveText("1");

    await gotoScreen(page, "Settings");
    await page.getByRole("checkbox", { name: "Deduplicate on import" }).uncheck();

    await gotoScreen(page, "Converter");
    await page.locator("textarea").first().fill(duplicatePair);
    await page.getByRole("button", { name: "Parse", exact: true }).click();

    await gotoScreen(page, "Dashboard");
    await expect(page.locator(".stat-value").first()).toHaveText("2");
  });

  test("Wipe Data double-confirms, then clears storage and reloads to an empty app", async ({ page }) => {
    await page.goto("/index.html");
    await gotoScreen(page, "Converter");
    await page.locator("textarea").first().fill(TLS_NO_SNI_NODE);
    await page.getByRole("button", { name: "Parse", exact: true }).click();

    await gotoScreen(page, "Dashboard");
    await expect(page.locator(".stat-value").first()).toHaveText("1");

    let dialogCount = 0;
    page.on("dialog", (dialog) => {
      dialogCount += 1;
      dialog.accept();
    });

    await gotoScreen(page, "Settings");
    const reloaded = page.waitForEvent("load");
    await page.getByRole("button", { name: "Wipe all data" }).click();
    await reloaded;

    // Dashboard is the app's default screen on a fresh load (no `.screen-title`
    // of its own — this hero-style empty state is the tell that wipe+reload
    // really dropped back to a clean app, not just navigated back to Settings).
    expect(dialogCount).toBe(2);
    await expect(page.getByText("No nodes parsed yet.")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".stat-value").first()).toHaveText("0");
  });
});
