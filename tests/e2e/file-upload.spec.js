/**
 * Real end-to-end coverage for the Converter Screen's Input Panel methods
 * (07-UI_UX_SYSTEM §4.2) — driven against the real built bundle
 * (`assets/js/app.js`, rebuilt by `npm run test:e2e`'s `pretest:e2e` hook)
 * in a real Chromium, not jsdom. Deliberately `.spec.js`, not `.test.js` —
 * `vitest.config.js`'s `include` only matches `tests/**\/*.test.js`, so
 * Vitest never picks this file up; only `playwright test` does.
 *
 * Scope:
 * - File Upload: covered below (`setInputFiles` with a real temp `.txt`).
 * - Clipboard Import: covered below too — Playwright can grant the
 *   `clipboard-read`/`clipboard-write` permissions and drive the real
 *   `navigator.clipboard` API, so this exercises the actual browser
 *   feature rather than a mock.
 * - Drag-Drop Zone: deliberately NOT covered here — see the comment block
 *   at the bottom of this file for the full reasoning. It keeps its
 *   Vitest/jsdom unit coverage instead
 *   (`tests/importer/from-drop-event.test.js`).
 */
import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.describe("Converter Screen — File Upload", () => {
  test("loads a real .txt file and parses it through the Worker-first path", async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), "unct-e2e-"));
    const filePath = join(dir, "config.txt");
    writeFileSync(
      filePath,
      "vless://aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@example.com:443" +
        "?security=tls&type=tcp&sni=example.com#node-one",
    );

    try {
      await page.goto("/index.html");
      await page.getByRole("button", { name: "Converter", exact: true }).click();

      await page.locator('input[type="file"]').setInputFiles(filePath);

      await expect(page.locator("textarea").first()).toHaveValue(/vless:\/\/.*node-one/);
      await expect(page.locator("dl dd").first()).toHaveText("url"); // Detected Format
      await expect(page.locator("table tbody tr")).toHaveCount(1);
      await expect(page.locator("table tbody tr td").first()).toHaveText("vless");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe("Converter Screen — Clipboard Import", () => {
  test("reads real clipboard text via the Clipboard API and parses it", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();

    const node =
      "vless://aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@example.net:2053" +
      "?security=tls&type=tcp&sni=example.net#clip-node";
    await page.evaluate((text) => navigator.clipboard.writeText(text), node);

    const clipboardButton = page.getByRole("button", { name: "Import from Clipboard" });
    await expect(clipboardButton).toBeEnabled(); // feature-detected, not disabled, in a real browser
    await clipboardButton.click();

    await expect(page.locator("textarea").first()).toHaveValue(node);
    await expect(page.locator("dl dd").first()).toHaveText("url");
  });
});

/**
 * Drag-Drop Zone (07-UI_UX_SYSTEM §4.2) has no Playwright E2E test in this
 * file — a deliberate scope decision, not an oversight:
 *
 * A file drag-and-drop gesture originates *outside* the page (the OS file
 * manager) and is dropped onto it. Playwright's drag support
 * (`locator.dragTo()`, manual `dispatchEvent` drag sequences) only models
 * one in-page element being dragged onto another in-page element — there
 * is no Playwright (or WebDriver/CDP) primitive for a real native
 * OS-level file drag, in this or any browser automation tool.
 *
 * The only way to simulate a file drop inside a page at all is to
 * construct a `DataTransfer`/`File` by hand and dispatch a synthetic
 * `drop` event — which is exactly what
 * `tests/importer/from-drop-event.test.js`'s Vitest/jsdom unit test
 * already does. Re-running that same synthetic construction here, just
 * inside a real Chromium instead of jsdom, would exercise the identical
 * fake input through the identical code path
 * (`extractTextFromDropEvent` only reads `event.dataTransfer.files[0]`)
 * — it would add no real-browser-specific coverage beyond what the unit
 * test already has. Hence: Drag-Drop stays Unit-Test-only by design.
 */
