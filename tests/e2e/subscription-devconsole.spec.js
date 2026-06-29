/**
 * Real end-to-end coverage for two Orphan Check wirings (Group 1 of 3,
 * items #2 and #4) — driven against the real built bundle
 * (`assets/js/app.js`, rebuilt by `npm run test:e2e`'s `pretest:e2e` hook)
 * in a real Chromium, not jsdom. Deliberately `.spec.js`, not `.test.js` —
 * mirrors `tests/e2e/file-upload.spec.js`'s pattern and naming convention.
 *
 * Item #2 (Subscription Center): "Security Score" Sort option +
 * "Security Score" table column, both sourced from the real
 * `AnalyzerState.analysisByNodeId` map (populated by clicking "Analyze" on
 * the Analyzer Screen) via `ui/subscription/format.js`.
 *
 * Item #4 (Developer Console): the merged "Warnings & Errors" table sorted
 * most-severe-first via `selectDiagnosticsSortedBySeverity`
 * (`core/store/selectors.js`), which recovers each line's real registered
 * severity through `core/errors/`'s `getErrorDef`/`compareSeverity`.
 *
 * Both nodes are parsed in one Parse action — a multi-line paste of two
 * `vless://` URLs is detected as a plain-text subscription
 * (`core/parser/subscription/detect.js`, score 85) and parsed into two
 * separate nodes, since `parserStore.setNodes` replaces the whole list on
 * every Parse (two separate Parse clicks would only ever keep the second
 * node).
 */
import { test, expect } from "@playwright/test";

const WARN_NODE =
  "vless://aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@warn.example.com:443" +
  "?security=tls&type=tcp#node-warn"; // no sni -> VAL_TLS_NO_SNI (warning)
const ERROR_NODE =
  "vless://aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@bad_host.com:443" +
  "?security=tls&type=tcp&sni=error.example.com#node-error"; // bad address -> VAL_ADDRESS_INVALID (error)

test.describe("Subscription Center — Security Score sort/column (Orphan Check #2)", () => {
  test("shows real Security Score values and sorts highest-first once Analyzed", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(`${WARN_NODE}\n${ERROR_NODE}`);
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.locator("section[aria-label='Normalized Object'] table tbody tr")).toHaveCount(2);

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    const nodeListTable = page.locator("section[aria-label='Node List'] table");
    await expect(nodeListTable.locator("tbody tr")).toHaveCount(2);
    // Before Analyzing, the Analyzer hasn't scored anything yet (Rule 9: never a fabricated 0).
    await expect(nodeListTable.locator("tbody tr td:nth-child(5)").first()).toHaveText("N/A");

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.locator("section[aria-label='Security Analysis'] dd").first()).not.toHaveText("N/A");

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    const scoreCells = nodeListTable.locator("tbody tr td:nth-child(5)");
    await expect(scoreCells.first()).toHaveText(/^\d+\/100$/);
    await expect(scoreCells.nth(1)).toHaveText(/^\d+\/100$/);

    const sortSelect = page.locator("section[aria-label='Sort'] select").first();
    await expect(sortSelect.locator("option", { hasText: "Security Score" })).toHaveCount(1);
    await sortSelect.selectOption("securityScore");

    const directionSelect = page.locator("section[aria-label='Sort'] select").nth(1);
    await expect(directionSelect).toBeDisabled();
    await expect(page.getByText("Security Score sort is always highest-first")).toBeVisible();

    const scores = await nodeListTable.locator("tbody tr td:nth-child(5)").allTextContents();
    const numericScores = scores.map((s) => Number(s.split("/")[0]));
    expect(numericScores).toEqual([...numericScores].sort((a, b) => b - a));
  });
});

test.describe("Developer Console — severity-sorted diagnostics (Orphan Check #4)", () => {
  test("ranks the error-severity diagnostic above the warning-severity diagnostic", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(`${WARN_NODE}\n${ERROR_NODE}`);
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.locator("section[aria-label='Normalized Object'] table tbody tr")).toHaveCount(2);

    await page.getByRole("button", { name: "Developer Console", exact: true }).click();
    const diagnosticsTable = page.locator("section[aria-label='Warnings and Errors'] table");
    await expect(diagnosticsTable.locator("thead th").first()).toHaveText("Severity");

    const severityCells = diagnosticsTable.locator("tbody tr td:first-child");
    await expect(severityCells).not.toHaveCount(0);
    const severities = await severityCells.allTextContents();
    const errorRow = severities.indexOf("error");
    const warningRow = severities.indexOf("warning");
    expect(errorRow).toBeGreaterThanOrEqual(0);
    expect(warningRow).toBeGreaterThanOrEqual(0);
    expect(errorRow).toBeLessThan(warningRow); // most-severe-first
  });
});
