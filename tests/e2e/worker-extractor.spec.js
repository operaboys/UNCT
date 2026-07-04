/**
 * Real end-to-end coverage for the Extractor Screen's Worker Extractor
 * (07-UI_UX_SYSTEM §4.5, un-deferred Orphan Check fix). Drives a real
 * BPB-Panel-style Cloudflare Worker VLESS node (`.workers.dev` address, a
 * UUID path segment, `ed=2048` query param — the exact real-world shape
 * `cloudflare-analyzer.test.js`/`worker-analyzer.test.js` already fixture)
 * through Parse -> Analyze -> Extractor Screen, against the real built
 * bundle (`assets/js/app.js`), in a real Chromium, not jsdom.
 */
import { test, expect } from "@playwright/test";

const UUID = "c3f5db00-1234-4abc-8def-abcdef012345";
const WORKER_NODE =
  `vless://${UUID}@bpb-panel.myworker.workers.dev:443` +
  `?security=tls&type=ws&host=bpb-panel.myworker.workers.dev&sni=bpb-panel.myworker.workers.dev` +
  `&path=%2F${UUID}%3Fed%3D2048#worker-node`;

test.describe("Extractor Screen — Worker Extractor (real data, no longer a placeholder)", () => {
  test("shows real Worker Domain / Path Segments / UUID Segment / Parameters for a detected Cloudflare Worker node", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(WORKER_NODE);
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    // Every panel from the Liquid Glass redesign is a `<div aria-label="...">`
    // (`.panel.glass-panel`), not a `<section>`.
    await expect(page.locator("[aria-label='Normalized Object'] table tbody tr")).toHaveCount(1);

    // Before Analyze runs, the Extractor Screen must not guess — Worker
    // detection is an Analyzer verdict, never a raw-field guess (Rule 9).
    await page.getByRole("button", { name: "Extractor", exact: true }).click();
    const workerSection = page.locator("[aria-label='Worker Extractor']");
    await expect(workerSection.getByText("No nodes analyzed yet")).toBeVisible();

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    // The Analyzer Screen's own pre-existing Worker Analysis section (not
    // touched by this change) already shows the same verdict — confirms the
    // shared AnalysisBundle, not a second/duplicated computation.
    const analyzerWorkerSection = page.locator("[aria-label='Worker Analysis']");
    await expect(analyzerWorkerSection.getByText("bpb-panel.myworker.workers.dev")).toBeVisible();

    await page.getByRole("button", { name: "Extractor", exact: true }).click();
    await expect(workerSection.locator("table tbody tr")).toHaveCount(1);
    const row = workerSection.locator("table tbody tr").first();
    await expect(row).toContainText("bpb-panel.myworker.workers.dev");
    await expect(row).toContainText(UUID);
    await expect(row).toContainText("ed=2048");
  });
});
