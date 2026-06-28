/**
 * Pure SVG path-building for the QR Export's raw boolean matrix
 * (`core/exporter/to-qr.js`, doc 08-EXPORT_ENGINE §6). Turns every dark
 * module into one "Mx yhNvNh-Nz" rect command joined into a single `<path>`
 * — the standard QR-to-SVG technique, keeping a ~30x30 matrix to one DOM
 * element instead of hundreds of individual `<rect>`s. Core only returns the
 * raw matrix (ADR-017); this is the one place that turns it into markup,
 * kept Preact-free and unit-testable on its own.
 */

/**
 * @param matrix square boolean matrix from `exportQr()`
 * @param cellSize pixels per module
 */
export function matrixToSvgPath(matrix: readonly (readonly boolean[])[], cellSize: number): string {
  const commands: string[] = [];
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (!matrix[row][col]) continue;
      commands.push(`M${col * cellSize} ${row * cellSize}h${cellSize}v${cellSize}h${-cellSize}z`);
    }
  }
  return commands.join("");
}

/** Standalone `<svg>` markup (with xmlns) for downloading a single QR code as a file. */
export function qrToSvgMarkup(matrix: readonly (readonly boolean[])[], moduleCount: number, cellSize: number): string {
  const size = moduleCount * cellSize;
  const path = matrixToSvgPath(matrix, cellSize);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
