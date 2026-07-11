/**
 * Pure formula tests for the Export Center's responsive QR Pagination page
 * size (`ui/export/qr-pagination.ts`, 2026-07-06 mobile bug fix) — mirrors
 * `.qr-grid`'s own CSS Grid math (`grid-template-columns: repeat(auto-fit,
 * minmax(160px, 1fr))`, `gap: 16px`) so these assertions double as a written
 * record of exactly how many columns a given container width produces.
 */
import { describe, it, expect } from "vitest";
import {
  computeQrColumnCount,
  computeQrPageSize,
  QR_ROWS_PER_PAGE,
} from "../../../ui/export/qr-pagination.js";

describe("computeQrColumnCount", () => {
  it("returns 1 for a zero or negative width (unmeasured / degenerate container)", () => {
    expect(computeQrColumnCount(0)).toBe(1);
    expect(computeQrColumnCount(-100)).toBe(1);
  });

  it("returns 1 for a narrow mobile-sized container (375px viewport minus panel padding)", () => {
    expect(computeQrColumnCount(335)).toBe(1);
  });

  it("returns exactly 1 at the single-track width (160px, no gap needed)", () => {
    expect(computeQrColumnCount(160)).toBe(1);
  });

  it("returns 1 just below the 2-column boundary, and 2 exactly at it", () => {
    // 2 tracks + 1 gap = 160*2 + 16 = 336px.
    expect(computeQrColumnCount(335)).toBe(1);
    expect(computeQrColumnCount(336)).toBe(2);
  });

  it("returns a real multi-column count for a typical desktop panel width", () => {
    expect(computeQrColumnCount(1200)).toBe(6);
  });
});

describe("computeQrPageSize", () => {
  it("is QR_ROWS_PER_PAGE items for a 1-column (mobile) grid -- a short, scrollable page", () => {
    expect(computeQrPageSize(335)).toBe(QR_ROWS_PER_PAGE);
    expect(computeQrPageSize(335)).toBeLessThanOrEqual(6);
  });

  it("scales up for a multi-column (desktop) grid -- column count * QR_ROWS_PER_PAGE", () => {
    expect(computeQrPageSize(1200)).toBe(6 * QR_ROWS_PER_PAGE);
  });

  it("never returns fewer items than one full row, regardless of width", () => {
    expect(computeQrPageSize(0)).toBeGreaterThanOrEqual(QR_ROWS_PER_PAGE);
  });
});
