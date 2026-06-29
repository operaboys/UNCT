/**
 * Real end-to-end coverage for the Subscription Analyzer's Summary Panel
 * (06-ANALYZER_ENGINE §2.5, Phase 10) — driven against the real built bundle
 * (`assets/js/app.js`, rebuilt by `npm run test:e2e`'s `pretest:e2e` hook) in
 * a real Chromium, not jsdom. Deliberately `.spec.js`, not `.test.js` —
 * mirrors `tests/e2e/compatibility-analyzer.spec.js`'s pattern and naming
 * convention.
 *
 * Parses four real nodes in one multi-line paste (plain-text subscription
 * detection, `core/parser/subscription/detect.js`):
 *  - node-A / node-B: deliberate duplicates — same protocol+address+port+uuid,
 *    different remark only (proves remark is excluded from the duplicate key).
 *  - node-C: a different protocol (trojan), no duplicate.
 *  - node-D: an invalid address (underscore, same VAL_ADDRESS_INVALID pattern
 *    `tests/e2e/subscription-devconsole.spec.js` already uses).
 *
 * Confirms the new "Summary" section (above the existing Node List) shows
 * real Total/Duplicate/Invalid/Dead-Candidate stats and a real Protocol
 * Distribution table BEFORE Analyzing, then a real, correctly-sorted
 * Security Ranking table AFTER Analyzing — Security Ranking has nothing to
 * show before Analyze runs (Rule 9: never a fabricated score).
 */
import { test, expect } from "@playwright/test";

// Both UUIDs are valid RFC-4122 (version nibble 1-5, variant nibble 8/9/a/b) so that
// node-A/node-B are invalid for NO reason other than being duplicates, and node-D is
// invalid for NO reason other than its bad address — isolating each test condition.
const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const NODE_A = `vless://${UUID}@dup.example.com:443?security=tls&type=tcp&sni=dup.example.com#node-A`;
const NODE_B = `vless://${UUID}@dup.example.com:443?security=tls&type=tcp&sni=dup.example.com#node-B`; // deliberate duplicate of A
const NODE_C = "trojan://secretpass@solo.example.com:443?security=tls&type=tcp&sni=solo.example.com#node-C";
const NODE_D =
  "vless://11111111-2222-3333-8444-555555555555@bad_host.com:443" +
  "?security=tls&type=tcp&sni=error.example.com#node-D"; // bad address -> invalid

test.describe("Subscription Center — Summary Panel (Phase 10, §2.5)", () => {
  test("renders real Total/Protocol/Duplicate/Invalid/Dead/Security stats", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(`${NODE_A}\n${NODE_B}\n${NODE_C}\n${NODE_D}`);
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.locator("section[aria-label='Normalized Object'] table tbody tr")).toHaveCount(4);

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    const summary = page.locator("section[aria-label='Summary']");
    await expect(summary.locator("h2")).toHaveText("Summary");

    const dd = summary.locator("dl dd");
    await expect(dd.nth(0)).toHaveText("4"); // Total Nodes
    await expect(dd.nth(1)).toHaveText("2"); // Duplicate Nodes (node-A + node-B)
    await expect(dd.nth(2)).toHaveText("1"); // Invalid Nodes (node-D)
    // No real liveness signal exists anywhere — must read "N/A", never a guessed count (Rule 9).
    await expect(dd.nth(3)).toHaveText("N/A"); // Dead Nodes Candidate

    const protocolTable = summary.locator("table[aria-label='Protocol Distribution']");
    const protocolRows = await protocolTable.locator("tbody tr").allTextContents();
    expect(protocolRows.some((r) => r.includes("vless") && r.includes("3"))).toBe(true);
    expect(protocolRows.some((r) => r.includes("trojan") && r.includes("1"))).toBe(true);

    // Before Analyzing, there is nothing to rank yet (Rule 9: never a fabricated 0).
    await expect(summary.getByText("No nodes analyzed yet")).toBeVisible();

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
    const rankingTable = summary.locator("table[aria-label='Security Ranking']");
    await expect(rankingTable.locator("tbody tr")).toHaveCount(4);
    const scores = await rankingTable.locator("tbody tr td:nth-child(2)").allTextContents();
    for (const s of scores) expect(s).toMatch(/^\d+\/100$/);
    const numericScores = scores.map((s) => Number(s.split("/")[0]));
    expect(numericScores).toEqual([...numericScores].sort((a, b) => b - a));
  });
});
