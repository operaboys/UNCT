/**
 * Pure formatting helper tests for the Export Center Screen (`ui/export/format.ts`).
 */
import { describe, it, expect } from "vitest";
import { formatSkipped } from "../../../ui/export/format.js";

describe("formatSkipped", () => {
  it("returns null when nothing was skipped", () => {
    expect(formatSkipped([])).toBeNull();
  });

  it("groups by the exact reason text and counts nodes per reason", () => {
    const skipped = [
      { nodeId: "a", protocol: "wireguard", reason: 'protocol "wireguard" is not supported by Xray JSON export' },
      { nodeId: "b", protocol: "wireguard", reason: 'protocol "wireguard" is not supported by Xray JSON export' },
      { nodeId: "c", protocol: "tuic", reason: 'protocol "tuic" is not supported by Xray JSON export' },
    ];
    expect(formatSkipped(skipped)).toBe(
      'protocol "wireguard" is not supported by Xray JSON export (2 nodes); '
      + 'protocol "tuic" is not supported by Xray JSON export (1 node)',
    );
  });
});
