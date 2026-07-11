/**
 * Pure SVG path-building tests for the QR Export's matrix renderer
 * (`ui/export/qr-render.ts`).
 */
import { describe, it, expect } from "vitest";
import { matrixToSvgPath, qrToSvgMarkup } from "../../../ui/export/qr-render.js";

describe("matrixToSvgPath", () => {
  it("emits no commands for an all-light matrix", () => {
    expect(matrixToSvgPath([[false, false], [false, false]], 4)).toBe("");
  });

  it("emits one rect command per dark module, scaled by cellSize", () => {
    const matrix = [
      [true, false],
      [false, true],
    ];
    expect(matrixToSvgPath(matrix, 4)).toBe("M0 0h4v4h-4zM4 4h4v4h-4z");
  });
});

describe("qrToSvgMarkup", () => {
  it("wraps the path in a standalone, sized <svg> with xmlns", () => {
    const matrix = [[true]];
    const svg = qrToSvgMarkup(matrix, 1, 10);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 10 10"');
    expect(svg).toContain('width="10" height="10"');
    expect(svg).toContain('<path d="M0 0h10v10h-10z" fill="#000"/>');
  });
});
