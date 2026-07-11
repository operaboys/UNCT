/**
 * parser-worker-client.ts tests (ADR-016: real Worker by default, file://-
 * only fallback to `parseAndValidate`).
 *
 * `createParserWorkerManager` is exercised directly with fake/throwing/
 * working constructors (no real browser needed — feature-detection is pure
 * dependency injection). `parseRawConfigWith` is exercised over both
 * branches: `null` (the fallback path, compared against `parseAndValidate`
 * directly) and a real `WorkerManager` built from `createMockWorkerFactory`
 * (the same Worker Mock `tests/worker/parser-worker.test.js` and
 * `tests/worker/worker-manager.test.js` already use) wired to the real
 * `handleParserJob`, proving the Worker-routed path produces the exact same
 * node shape as the direct path, only `nodeId`/`createdAt`/`updatedAt`
 * differ (each pipeline run mints its own).
 */
import { describe, it, expect } from "vitest";
import { parseAndValidate } from "../../../core/parser/parse-and-validate.js";
import { createWorkerManager, CancelledError } from "../../../core/worker/worker-manager.js";
import { handleParserJob } from "../../../core/worker/parser.worker.js";
import { createMockWorkerFactory } from "../../setup/worker-mock.js";
import {
  createParserWorkerManager,
  parseRawConfigWith,
} from "../../../ui/store/parser-worker-client.js";

const SAMPLE_VLESS_URL =
  "vless://b831381d-6324-4d53-ad4f-8cda48b30811@ex.example.com:443" +
  "?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome" +
  "&pbk=PUBKEY123&sid=ab12&type=grpc&serviceName=gsvc&flow=xtls-rprx-vision#reality";

/**
 * Strips the three independently-regenerated-per-run fields so two separate
 * pipeline executions over the same input can be compared for equality.
 * @param {any} node
 */
function stableNode(node) {
  const { nodeId, createdAt, updatedAt, ...rest } = node;
  return rest;
}

describe("createParserWorkerManager — feature detection (ADR-016)", () => {
  it("returns null when no Worker constructor is available", () => {
    expect(createParserWorkerManager(undefined)).toBeNull();
  });

  it("returns null when constructing a Worker throws synchronously (the file:// case)", () => {
    class ThrowingWorker {
      constructor() {
        throw new Error("Failed to construct 'Worker': ... cannot be accessed from origin 'null'.");
      }
    }
    expect(createParserWorkerManager(/** @type {any} */ (ThrowingWorker))).toBeNull();
  });

  it("returns a real manager when the Worker constructor succeeds, constructed with the worker URL + module type", () => {
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

    const manager = createParserWorkerManager(/** @type {any} */ (FakeWorker));

    expect(manager).not.toBeNull();
    expect(typeof manager?.runJob).toBe("function");
    // `createWorkerManager` eagerly constructs one worker per pool slot, so
    // there is one call per slot, not exactly one — every call must still use
    // the parser worker's URL + module type.
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toEqual({ url: "assets/js/parser-worker.js", opts: { type: "module" } });
    }
  });
});

describe("parseRawConfigWith — fallback path (manager: null)", () => {
  it("matches parseAndValidate's direct output, modulo per-run generated fields", async () => {
    const direct = parseAndValidate(SAMPLE_VLESS_URL);

    const result = await parseRawConfigWith(null, SAMPLE_VLESS_URL);

    expect(result.parserName).toBe(direct.parserName);
    expect(result.recovered).toBe(direct.recovered);
    expect(result.nodes.map(stableNode)).toEqual(direct.nodes.map(stableNode));
  });
});

describe("parseRawConfigWith — real Worker-routed path (Worker Mock + handleParserJob)", () => {
  it("dispatches through the worker, unflattens, and matches the direct path's output modulo generated fields", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleParserJob), poolSize: 2,
    });
    const direct = parseAndValidate(SAMPLE_VLESS_URL);

    const result = await parseRawConfigWith(manager, SAMPLE_VLESS_URL);

    expect(result.parserName).toBe(direct.parserName);
    expect(result.recovered).toBe(direct.recovered);
    expect(result.nodes.map(stableNode)).toEqual(direct.nodes.map(stableNode));
  });

  it("a superseded parseRawConfigWith call rejects with CancelledError while the newer one resolves", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleParserJob), poolSize: 1,
    });

    // parseRawConfigWith doesn't take a `track` option itself — it dispatches
    // through `manager.runJob` directly using the module's fixed
    // "converter-screen-parse" track, so two concurrent calls against the
    // SAME manager already supersede each other exactly as two real Parse
    // clicks would (ADR-016 / 10-PERFORMANCE_ENGINE §6.1). Both calls must
    // happen with no `await` between them: `handleParserJob` is fast/sync
    // enough that a real worker-mock round-trip can finish well inside a
    // 5ms gap, which would let A settle for real before B ever supersedes
    // it (unlike `worker-manager.test.js`'s own cancellation test, whose
    // `delayedEchoHandler` accepts an artificial `delay` precisely to avoid
    // this — `handleParserJob`'s envelope has no such knob).
    const a = parseRawConfigWith(manager, SAMPLE_VLESS_URL);
    const b = parseRawConfigWith(manager, SAMPLE_VLESS_URL);

    await expect(b).resolves.toMatchObject({ parserName: "url", recovered: false });
    await expect(a).rejects.toBeInstanceOf(CancelledError);
  });
});
