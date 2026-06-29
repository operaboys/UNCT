/**
 * Real end-to-end coverage for the Compatibility Analyzer (06-ANALYZER_ENGINE
 * §2.6, Phase 10) — driven against the real built bundle (`assets/js/app.js`,
 * rebuilt by `npm run test:e2e`'s `pretest:e2e` hook) in a real Chromium, not
 * jsdom. Deliberately `.spec.js`, not `.test.js` — mirrors
 * `tests/e2e/subscription-devconsole.spec.js`'s pattern and naming
 * convention.
 *
 * Parses a real `vless://` Reality URL, runs Analyze, and confirms the NEW
 * "Platform & Client Compatibility" section (distinct from the pre-existing
 * "Compatibility Analysis" section, which is the Network Analyzer's output)
 * renders real ✅/❌/❓ badges — including the task's own canonical
 * "نامشخص" example: v2rayNG reads ❓ for Reality while every other client
 * reads ✅ (Rule 9 — never a fabricated guess).
 */
import { test, expect } from "@playwright/test";

const REALITY_NODE =
  "vless://aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@example.com:443" +
  "?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome" +
  "&pbk=PUBKEY123&sid=ab12&type=grpc&serviceName=gsvc#reality-node";

test.describe("Analyzer Screen — Platform & Client Compatibility (Phase 10, §2.6)", () => {
  test("renders real badges for both tables, including the v2rayNG/Reality unknown case", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(REALITY_NODE);
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.locator("section[aria-label='Normalized Object'] table tbody tr")).toHaveCount(1);

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    const section = page.locator("section[aria-label='Platform & Client Compatibility']");
    await expect(section.locator("h2")).toHaveText("Platform & Client Compatibility");

    // The pre-existing, differently-scoped section must still be present and
    // unrelated — proves this is a NEW section, not a renamed/repurposed one.
    await expect(page.locator("section[aria-label='Compatibility Analysis'] h2")).toHaveText("Compatibility Analysis");

    const platformTable = section.locator("table[aria-label='Platform Compatibility']");
    await expect(platformTable.locator("thead th")).toHaveText(["Android", "iOS", "Windows", "Linux", "macOS"]);
    const platformBadges = await platformTable.locator("tbody td").allTextContents();
    expect(platformBadges).toHaveLength(5);
    for (const badge of platformBadges) expect(["✅", "❌", "❓"]).toContain(badge);

    const clientTable = section.locator("table[aria-label='Client Compatibility']");
    await expect(clientTable.locator("thead th")).toHaveText(["Xray", "sing-box", "Clash Meta", "NekoBox", "v2rayNG", "Hiddify"]);
    const clientBadges = clientTable.locator("tbody td");
    await expect(clientBadges).toHaveCount(6);

    // The task's own canonical نامشخص example: Reality on v2rayNG is unknown
    // while every other client is compatible (grpc/reality, all non-v2rayNG
    // clients true).
    await expect(clientBadges.nth(0)).toHaveText("✅"); // Xray
    await expect(clientBadges.nth(1)).toHaveText("✅"); // sing-box
    await expect(clientBadges.nth(2)).toHaveText("✅"); // Clash Meta
    await expect(clientBadges.nth(3)).toHaveText("✅"); // NekoBox
    await expect(clientBadges.nth(4)).toHaveText("❓"); // v2rayNG — نامشخص
    await expect(clientBadges.nth(5)).toHaveText("✅"); // Hiddify
  });
});
