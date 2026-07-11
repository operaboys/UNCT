/**
 * Real end-to-end proof of the Analyze timeout safety-net
 * (`ui/store/analyzer-worker-client.ts`'s `ANALYZE_TIMEOUT_MS`/`withTimeout`,
 * `core/worker/worker-manager.js`'s `forceRelease`) — added after an urgent
 * "Analyze always gets stuck" report that could not be reproduced (see
 * README's checkpoint entry: no relevant code changed in `core/analyzer/`,
 * `ui/analyzer/`, or `ui/store/` since before the last several checkpoints,
 * and direct real-browser + direct Node-level repro attempts with the exact
 * reported real Xray-array data both completed normally). Regardless of
 * root cause, this proves the UI can never wait on "Analyzing…" forever:
 * a real Worker is overridden here (module Worker construction itself still
 * succeeds — only its `postMessage` is silenced) so the analyzer Worker
 * genuinely never sends any message/error back, the exact "stalled forever"
 * scenario the safety-net exists for.
 */
import { test, expect } from "@playwright/test";

test.describe("Analyze timeout safety-net — Worker that never responds", () => {
  test("isAnalyzing resets, a clear timeout error shows, and Analyze works normally afterward", async ({ page }) => {
    test.setTimeout(60_000);

    // Silence ONLY the analyzer Worker's postMessage (so it never actually
    // dispatches to the real Worker thread and therefore never responds) --
    // the Parser Worker is left completely real, so Import/Parse still
    // works normally to reach the Analyzer screen with real data. Gated by
    // a toggleable flag (not silenced unconditionally at construction time)
    // so the test can flip it back to real behavior afterward -- the
    // analyzer's Worker manager singleton captures its `Worker` constructor
    // reference once at module load, so a later `window.Worker` swap alone
    // could never reach the same already-constructed instance.
    await page.addInitScript(() => {
      const w = /** @type {any} */ (window);
      w.__silenceAnalyzerWorker = true;
      const OrigWorker = window.Worker;
      w.Worker = new Proxy(OrigWorker, {
        construct(/** @type {any} */ target, /** @type {any} */ args) {
          const url = args[0];
          const instance = Reflect.construct(target, args);
          if (typeof url === "string" && url.includes("analyzer")) {
            const realPostMessage = instance.postMessage.bind(instance);
            instance.postMessage = (/** @type {unknown} */ data) => {
              if (w.__silenceAnalyzerWorker) return;
              realPostMessage(data);
            };
          }
          return instance;
        },
      });
    });

    await page.goto("/index.html");
    await page.getByRole("button", { name: "Converter", exact: true }).click();
    await page.locator("textarea").first().fill(
      "vless://aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee@host.example.com:443?security=tls&type=tcp&sni=host.example.com#node-1",
    );
    await page.getByRole("button", { name: "Parse", exact: true }).click();
    await expect(page.getByRole("button", { name: "Parse", exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Analyzer", exact: true }).click();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();

    // Immediately after clicking, the button must show the in-progress
    // state (proving the Job really did dispatch, not fail synchronously).
    await expect(page.getByRole("button", { name: "Analyzing…", exact: true })).toBeVisible({ timeout: 2_000 });

    // The safety-net's 30s timeout must fire and free the button -- without
    // it, this would hang for the rest of the test's 60s budget and fail.
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeVisible({ timeout: 40_000 });

    // A real, clear error is shown -- not a silent reset.
    await expect(page.locator(".alert--error")).toContainText(/took too long/i);

    // Analyze still works normally afterward on a fresh click -- the
    // safety-net's forceRelease genuinely reclaimed the pool slot (this
    // proves it, not just that the caller-facing promise settled): letting
    // the analyzer Worker actually respond again, a NEW Analyze must
    // complete quickly through the very slot the stalled Job occupied.
    await page.evaluate(() => { /** @type {any} */ (window).__silenceAnalyzerWorker = false; });
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[aria-label="Security Analysis"] dd').first()).not.toHaveText("N/A");
  });
});
