/**
 * Subscription Visualizer's pure bar-chart computation (P12-11).
 */
import { describe, it, expect } from "vitest";
import { buildProtocolBars } from "../../../ui/subscription/chart.js";

describe("buildProtocolBars", () => {
  it("returns an empty array for an empty distribution", () => {
    expect(buildProtocolBars({})).toEqual([]);
  });

  it("normalizes bar widths against the largest count (that bar reaches 100%)", () => {
    const bars = buildProtocolBars({ vless: 8, trojan: 4, tuic: 2 });

    expect(bars).toEqual([
      { protocol: "vless", count: 8, percent: 100 },
      { protocol: "trojan", count: 4, percent: 50 },
      { protocol: "tuic", count: 2, percent: 25 },
    ]);
  });

  it("sorts highest-count-first, independent of input key order", () => {
    const bars = buildProtocolBars({ tuic: 1, vless: 5, trojan: 3 });

    expect(bars.map((b) => b.protocol)).toEqual(["vless", "trojan", "tuic"]);
  });

  it("gives every protocol a 100% bar when all counts are equal", () => {
    const bars = buildProtocolBars({ vless: 3, trojan: 3 });

    expect(bars.every((b) => b.percent === 100)).toBe(true);
  });

  it("handles a single protocol (its own bar is always 100%)", () => {
    expect(buildProtocolBars({ vless: 5 })).toEqual([{ protocol: "vless", count: 5, percent: 100 }]);
  });

  it("rounds percentages to the nearest whole number", () => {
    const bars = buildProtocolBars({ a: 3, b: 1 });
    expect(bars).toEqual([
      { protocol: "a", count: 3, percent: 100 },
      { protocol: "b", count: 1, percent: 33 },
    ]);
  });
});
