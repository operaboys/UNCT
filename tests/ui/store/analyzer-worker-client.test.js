/**
 * analyzer-worker-client.ts tests — mirrors parser-worker-client.test.js's
 * structure for the Analyzer Screen's analyze step: real Worker by default,
 * file://-only fallback to `analyzeBatch`.
 *
 * `createAnalyzerWorkerManager` is exercised directly with fake/throwing/
 * working constructors (pure dependency injection, no real browser needed).
 * `analyzeNodesWith` is exercised over both branches: `null` (the fallback
 * path, compared against `analyzeBatch` directly) and a real `WorkerManager`
 * built from `createMockWorkerFactory` wired to the real `handleAnalyzerJob`
 * (the same Worker Mock `tests/worker/analyzer-worker.test.js` already uses).
 */
import { describe, it, expect } from "vitest";
import { analyzeBatch } from "../../../core/analyzer/analyze-node.js";
import { createWorkerManager, CancelledError } from "../../../core/worker/worker-manager.js";
import { handleAnalyzerJob } from "../../../core/worker/analyzer.worker.js";
import { createMockWorkerFactory } from "../../setup/worker-mock.js";
import { parseUrl, normalizeUrl } from "../../../core/parser/url/index.js";
import {
  createAnalyzerWorkerManager,
  analyzeNodesWith,
} from "../../../ui/store/analyzer-worker-client.js";

const SAMPLE_VLESS_URL =
  "vless://b831381d-6324-4d53-ad4f-8cda48b30811@ex.example.com:443" +
  "?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome" +
  "&pbk=PUBKEY123&sid=ab12&type=grpc&serviceName=gsvc&flow=xtls-rprx-vision#reality";

const NODE = normalizeUrl(parseUrl(SAMPLE_VLESS_URL));

describe("createAnalyzerWorkerManager — feature detection", () => {
  it("returns null when no Worker constructor is available", () => {
    expect(createAnalyzerWorkerManager(undefined)).toBeNull();
  });

  it("returns null when constructing a Worker throws synchronously (the file:// case)", () => {
    class ThrowingWorker {
      constructor() {
        throw new Error("Failed to construct 'Worker': ... cannot be accessed from origin 'null'.");
      }
    }
    expect(createAnalyzerWorkerManager(/** @type {any} */ (ThrowingWorker))).toBeNull();
  });

  it("returns a real manager when the Worker constructor succeeds, constructed with the analyzer worker URL + module type", () => {
    /** @type {{ url: string, opts: unknown }[]} */
    const calls = [];
    class FakeWorker {
      /** @param {string} url @param {unknown} opts */
      constructor(url, opts) {
        calls.push({ url, opts });
      }
      postMessage() {}
      addEventListener() {}
      removeEventListener() {}
      terminate() {}
    }

    const manager = createAnalyzerWorkerManager(/** @type {any} */ (FakeWorker));

    expect(manager).not.toBeNull();
    expect(typeof manager?.runJob).toBe("function");
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toEqual({ url: "core/worker/analyzer.worker.js", opts: { type: "module" } });
    }
  });
});

describe("analyzeNodesWith — fallback path (manager: null)", () => {
  it("matches analyzeBatch's direct output exactly", async () => {
    const direct = analyzeBatch([NODE]);

    const result = await analyzeNodesWith(null, [NODE]);

    expect(result).toEqual(direct);
  });
});

describe("analyzeNodesWith — real Worker-routed path (Worker Mock + handleAnalyzerJob)", () => {
  it("dispatches through the worker and matches the direct path's output", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleAnalyzerJob), poolSize: 2,
    });
    const direct = analyzeBatch([NODE]);

    const result = await analyzeNodesWith(manager, [NODE]);

    expect(result).toEqual(direct);
  });

  it("a superseded analyzeNodesWith call rejects with CancelledError while the newer one resolves", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleAnalyzerJob), poolSize: 1,
    });

    const a = analyzeNodesWith(manager, [NODE]);
    const b = analyzeNodesWith(manager, [NODE]);

    await expect(b).resolves.toEqual(analyzeBatch([NODE]));
    await expect(a).rejects.toBeInstanceOf(CancelledError);
  });
});
