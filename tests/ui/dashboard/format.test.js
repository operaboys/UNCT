/**
 * ui/dashboard/format.ts tests — mirrors tests/ui/analyzer/format.test.js's
 * structure for the Dashboard Screen's formatting module.
 */
import { describe, it, expect } from "vitest";
import { formatAverageScore } from "../../../ui/dashboard/format.js";

describe("formatAverageScore", () => {
  it("rounds and formats a 0-100 average score with its scale", () => {
    expect(formatAverageScore(87)).toBe("87/100");
    expect(formatAverageScore(59.5)).toBe("60/100");
    expect(formatAverageScore(0)).toBe("0/100");
  });

  it("returns 'N/A' for null, never collapsing into a fabricated 0 (Rule 9)", () => {
    expect(formatAverageScore(null)).toBe("N/A");
    expect(formatAverageScore(null)).not.toBe(formatAverageScore(0));
  });
});
