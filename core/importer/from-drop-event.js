/**
 * Pure text extraction from a Drag-Drop `DragEvent` (07-UI_UX_SYSTEM
 * §4.2's Drag-Drop Zone). Reuses `readFileAsText` for the actual read so
 * File Upload and Drag-Drop share one code path — this file only knows
 * how to pull a `File` out of a `DataTransfer`.
 */
import { readFileAsText } from "./from-file.js";

/**
 * @param {DragEvent} event
 * @returns {Promise<string>}
 */
export function extractTextFromDropEvent(event) {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return Promise.reject(new Error("Drop event contained no file"));
  return readFileAsText(file);
}
