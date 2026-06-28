/**
 * converter-worker-client.ts tests (ADR-016's pattern, reused for the
 * Converter Screen's convert step: real Worker by default, file://-only
 * fallback to `convertBatch`).
 *
 * Mirrors `tests/ui/store/parser-worker-client.test.js`'s structure exactly.
 * `createConverterWorkerManager` is exercised directly with fake/throwing/
 * working constructors (no real browser needed). `convertBatchWith` is
 * exercised over both branches: `null` (the fallback path, compared against
 * `convertBatch` directly) and a real `WorkerManager` built from
 * `createMockWorkerFactory` wired to the real `handleConverterJob`, proving
 * the Worker-routed path produces the exact same output as the direct path
 * — no flatten/unflatten step exists here (unlike the parser client), so the
 * two paths' outputs are expected to match exactly, not just modulo
 * generated fields.
 */
import { describe, it, expect } from "vitest";
import { convertBatch } from "../../../core/converter/conversion.js";
import { createWorkerManager, CancelledError } from "../../../core/worker/worker-manager.js";
import { handleConverterJob } from "../../../core/worker/converter.worker.js";
import { createMockWorkerFactory } from "../../setup/worker-mock.js";
import { createNode } from "../../../core/unm/create-node.js";
import {
  createConverterWorkerManager,
  convertBatchWith,
} from "../../../ui/converter/converter-worker-client.js";

const NODES = [
  createNode({ sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1" }),
  createNode({
    sourceType: "wireguard-config", protocol: "wireguard", address: "g.example.com", port: 51820,
    extensions: { wireguard: { privateKey: "priv", publicKey: "pub", allowedIPs: ["10.0.0.2/32"] } },
  }),
];

describe("createConverterWorkerManager — feature detection (ADR-016 pattern)", () => {
  it("returns null when no Worker constructor is available", () => {
    expect(createConverterWorkerManager(undefined)).toBeNull();
  });

  it("returns null when constructing a Worker throws synchronously (the file:// case)", () => {
    class ThrowingWorker {
      constructor() {
        throw new Error("Failed to construct 'Worker': ... cannot be accessed from origin 'null'.");
      }
    }
    expect(createConverterWorkerManager(/** @type {any} */ (ThrowingWorker))).toBeNull();
  });

  it("returns a real manager when the Worker constructor succeeds, constructed with the converter worker URL + module type", () => {
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

    const manager = createConverterWorkerManager(/** @type {any} */ (FakeWorker));

    expect(manager).not.toBeNull();
    expect(typeof manager?.runJob).toBe("function");
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toEqual({ url: "assets/js/converter-worker.js", opts: { type: "module" } });
    }
  });
});

describe("convertBatchWith — fallback path (manager: null)", () => {
  it("matches convertBatch's direct output exactly", async () => {
    const direct = convertBatch(NODES, "clashYaml");

    const result = await convertBatchWith(null, NODES, "clashYaml");

    expect(result).toEqual(direct);
  });
});

describe("convertBatchWith — real Worker-routed path (Worker Mock + handleConverterJob)", () => {
  it("dispatches through the worker and matches the direct path's output exactly (no flatten/unflatten step)", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleConverterJob), poolSize: 2,
    });
    const direct = convertBatch(NODES, "clashYaml");

    const result = await convertBatchWith(manager, NODES, "clashYaml");

    expect(result).toEqual(direct);
  });

  it("a superseded convertBatchWith call rejects with CancelledError while the newer one resolves", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(handleConverterJob), poolSize: 1,
    });

    const a = convertBatchWith(manager, NODES, "clashYaml");
    const b = convertBatchWith(manager, NODES, "xrayJson");

    await expect(b).resolves.toMatchObject({ converted: [{ nodeId: NODES[0].nodeId, output: expect.any(String) }] });
    await expect(a).rejects.toBeInstanceOf(CancelledError);
  });
});
