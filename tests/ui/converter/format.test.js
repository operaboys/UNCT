/**
 * Pure formatting helper tests for the Converter Screen (`ui/converter/format.ts`)
 * — the non-rendering logic split out of `converter-screen.tsx`'s JSX.
 */
import { describe, it, expect } from "vitest";
import {
  formatProtocolCounts,
  formatDiagnosticList,
  formatSkippedProtocols,
} from "../../../ui/converter/format.js";

describe("formatProtocolCounts", () => {
  it("returns an em dash placeholder for an empty count map", () => {
    expect(formatProtocolCounts({})).toBe("—");
  });

  it("joins protocol:count pairs in insertion order", () => {
    expect(formatProtocolCounts({ vless: 2, trojan: 1 })).toBe("vless: 2, trojan: 1");
  });
});

describe("formatDiagnosticList", () => {
  it('returns "none" for an empty list', () => {
    expect(formatDiagnosticList([])).toBe("none");
  });

  it("joins entries with a semicolon separator", () => {
    expect(formatDiagnosticList(["bad uuid", "bad port"])).toBe("bad uuid; bad port");
  });
});

describe("formatSkippedProtocols", () => {
  it("returns null when nothing was skipped", () => {
    expect(formatSkippedProtocols([])).toBeNull();
  });

  it("formats the count and the joined protocol list", () => {
    const skipped = [{ protocol: "hysteria2" }, { protocol: "tuic" }, { protocol: "hysteria2" }];
    expect(formatSkippedProtocols(skipped)).toBe(
      "Skipped (3, protocol not supported by this format): hysteria2, tuic, hysteria2",
    );
  });
});
