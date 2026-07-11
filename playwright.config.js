/**
 * E2E config (07-UI_UX_SYSTEM §4.2's Converter Screen input methods).
 * `tests/e2e/*.spec.js` is deliberately outside `vitest.config.js`'s
 * `tests/**\/*.test.js` include — Playwright owns this directory, Vitest
 * never sees it. Run via `npm run test:e2e` (its `pretest:e2e` hook
 * rebuilds `assets/js/` first, since these tests load the real bundle).
 */
import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// This container ships a pre-installed Chromium outside Playwright's own
// version-pinned browser cache (see README's E2E dev-note) — when present,
// launch it directly instead of letting Playwright's normal browser
// lookup fail on a revision mismatch. Anywhere else (a plain dev machine
// or CI with `npx playwright install` run), this path won't exist and
// Playwright falls back to its own default resolution.
const preinstalledChromium = "/opt/pw-browsers/chromium";
const executablePath = existsSync(preinstalledChromium) ? preinstalledChromium : undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:4173",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: "node scripts/static-server.js",
    url: "http://localhost:4173/index.html",
    reuseExistingServer: !process.env.CI,
  },
});
