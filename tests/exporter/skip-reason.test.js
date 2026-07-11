/**
 * `withSkipReason` tests. The Export Center Screen (07-UI_UX_SYSTEM §4.6)
 * needs to tell the user WHY a node was left out of an export, not just
 * which node — this is the shared helper every batching exporter in
 * core/exporter/ runs its Batch Conversion `skipped` array through.
 */
import { describe, it, expect } from "vitest";
import { withSkipReason } from "../../core/exporter/skip-reason.js";

describe("withSkipReason", () => {
  it("attaches a reason naming the protocol and format to each skipped entry", () => {
    const skipped = [{ nodeId: "id-1", protocol: "wireguard" }, { nodeId: "id-2", protocol: "made-up" }];
    expect(withSkipReason(skipped, "Xray JSON")).toEqual([
      { nodeId: "id-1", protocol: "wireguard", reason: 'protocol "wireguard" is not supported by Xray JSON export' },
      { nodeId: "id-2", protocol: "made-up", reason: 'protocol "made-up" is not supported by Xray JSON export' },
    ]);
  });

  it("returns an empty array for an empty skipped list", () => {
    expect(withSkipReason([], "TXT")).toEqual([]);
  });
});
