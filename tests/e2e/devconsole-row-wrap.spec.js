/**
 * Real-browser regression test for the sticky-header-occlusion bug reported
 * with a real screenshot (2026-07-06): DevConsole's Parser Logs / Detection
 * Logs tables showed a Node ID clearly wrapped onto 2 lines, and separately
 * a Node ID fragment sitting plainly legible right at the sticky header's
 * boundary. Three earlier fix attempts tuned the sticky header's
 * `backdrop-filter`/opacity and did not fix it, because the actual defect
 * was never about translucency: it was DATA ROWS wrapping onto 2 lines.
 *
 * Root cause: `table-layout: fixed` divides a table's width evenly across
 * columns with no per-column hint unless a column has an explicit `width`.
 * Two raw, unformatted values are wide enough to overflow that even split
 * at realistic (sub-1280px) viewport widths and neither had an explicit
 * width: the 36-char Node ID (UUID) and the 24-char ISO 8601 `createdAt`
 * timestamp. A wrapped ROW is taller than the sticky header, which only
 * ever covers a single line's height -- so the wrapped second line was
 * never actually behind the header at all, it sat next to it, fully
 * legible regardless of the header's own opacity/blur.
 *
 * The fix is an explicit `width` (not `min-width` -- verified in a real
 * browser that `table-layout: fixed` ignores `min-width` for column sizing)
 * on both the Node ID and the timestamp column, sized to fit their real
 * content. This test proves ROW height stays single-line with real Xray
 * data at a real narrow viewport, which is what the two prior column-width
 * tests (`data-table-column-width.spec.js`, headers only) did not cover.
 */
import { test, expect } from "@playwright/test";

/** @param {number} count */
function buildXrayJsonArray(count) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    const host = `xray-doc-${String(i).padStart(4, "0")}.example.com`;
    docs.push({
      log: { loglevel: "warning" },
      outbounds: [
        {
          protocol: "vless",
          tag: `proxy-${i}`,
          settings: {
            vnext: [{ address: host, port: 443, users: [{ id: crypto.randomUUID(), encryption: "none" }] }],
          },
          streamSettings: { network: "tcp", security: "tls", tlsSettings: { serverName: host } },
        },
        { protocol: "freedom", tag: "direct" },
      ],
    });
  }
  return JSON.stringify(docs);
}

/** A single-line data row at this app's 13px font + `padding-block: 10px`
 * top/bottom renders at ~38px; a wrapped (2-line) row jumps to ~54-55px
 * regardless of minor font-rendering differences across machines. */
const MAX_SINGLE_LINE_ROW_HEIGHT = 46;

for (const width of [1280, 1000, 900]) {
  test(`DevConsole Parser Logs + Detection Logs rows stay single-line with real Xray data at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(buildXrayJsonArray(30));
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Developer Console", exact: true }).click();

    for (const label of ["Parser Logs", "Detection Logs"]) {
      const panel = page.locator(`[aria-label="${label}"]`);
      await expect(panel).toBeVisible();
      const rows = panel.locator("tbody tr");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < Math.min(count, 10); i++) {
        const box = await rows.nth(i).boundingBox();
        if (!box) throw new Error(`${label} row ${i} has no bounding box`);
        expect(box.height).toBeLessThan(MAX_SINGLE_LINE_ROW_HEIGHT);
      }
    }
  });
}

test("Subscription Center Node List 'Imported At' column stays single-line with a real ISO timestamp at a narrow viewport", async ({ page }) => {
  // Unlike DevConsole's plain-text rows, every Node List row also carries
  // Test/Check/Lookup/Save-as-Template buttons, which make the row taller
  // than a text-only row regardless of wrapping -- so row height is not a
  // valid single-line signal here. Instead, check the timestamp cell's own
  // text node renders as exactly one line box (`getClientRects()` returns
  // one rect for unwrapped text, two-plus for wrapped text).
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/index.html");
  await page.getByRole("button", { name: "Converter", exact: true }).click();
  await page.locator("textarea").first().fill(
    'vless://aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee@host-00.example.com:443?security=tls&type=tcp&sni=host-00.example.com#node-0',
  );
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Subscription Center", exact: true }).click();
  const nodeListTable = page.locator("[aria-label='Node List'] table").first();
  await expect(nodeListTable).toBeVisible();

  const timestampCell = nodeListTable.locator("tbody tr").first().locator("td.col-timestamp");
  await expect(timestampCell).toBeVisible();
  const lineCount = await timestampCell.evaluate((td) => {
    const range = document.createRange();
    range.selectNodeContents(td.querySelector("bdi") ?? td);
    return range.getClientRects().length;
  });
  expect(lineCount).toBe(1);
});
