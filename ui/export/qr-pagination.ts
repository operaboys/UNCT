/**
 * Pure formula mirroring `.qr-grid`'s own CSS Grid column math
 * (`assets/css/theme.css`: `grid-template-columns: repeat(auto-fit,
 * minmax(160px, 1fr))`, `gap: 16px`) so QR Pagination's page size scales
 * with the REAL rendered column count instead of one hardcoded constant
 * for every viewport (2026-07-06 mobile bug). The old fixed
 * `QR_PAGE_SIZE = 24` was fine on a multi-column desktop grid (24 items
 * over a handful of rows), but the same grid collapses to 1 real column on
 * a narrow mobile viewport -- those same 24 items became 24 stacked rows,
 * a page the user had to scroll through in full just to reach "Next",
 * defeating pagination's entire point.
 *
 * `QR_ROWS_PER_PAGE` is the middle of the requested "4-6 full rows per
 * page" range, so every viewport's page is always a small, bounded number
 * of rows regardless of how many columns actually fit.
 */

/** Mirrors `.qr-grid`'s CSS `minmax(160px, ...)` track minimum. */
export const QR_GRID_TRACK_MIN_PX = 160;
/** Mirrors `.qr-grid`'s CSS `gap: 16px`. */
export const QR_GRID_GAP_PX = 16;
/** Middle of the requested "4-6 full rows per page" range. */
export const QR_ROWS_PER_PAGE = 5;
/** Used only before the grid container has been measured once (its
 * ResizeObserver has not reported a size yet) -- the previous fixed page
 * size, so there is no behavior change during that brief unmeasured
 * window before first layout. */
export const QR_PAGE_SIZE_FALLBACK = 24;

/**
 * The number of `minmax(160px, 1fr)` tracks that actually fit a container
 * this wide under CSS Grid's `auto-fit` algorithm: the largest `n` such
 * that `n` tracks plus `n-1` gaps fit within `containerWidthPx`. Always at
 * least 1 (mirrors the browser's own minimum of one track per row).
 */
export function computeQrColumnCount(containerWidthPx: number): number {
  if (containerWidthPx <= 0) return 1;
  const columns = Math.floor(
    (containerWidthPx + QR_GRID_GAP_PX) / (QR_GRID_TRACK_MIN_PX + QR_GRID_GAP_PX),
  );
  return Math.max(1, columns);
}

/**
 * Page size = real column count * `QR_ROWS_PER_PAGE`, so every viewport's
 * page is always a small, bounded number of full rows -- 1 column
 * (mobile) gives `QR_ROWS_PER_PAGE` items; N columns (desktop) gives
 * `N * QR_ROWS_PER_PAGE`.
 */
export function computeQrPageSize(containerWidthPx: number): number {
  return computeQrColumnCount(containerWidthPx) * QR_ROWS_PER_PAGE;
}
