/**
 * Pure text extraction from a `File` (07-UI_UX_SYSTEM §4.2's File Upload).
 * Wraps `FileReader` in a Promise so callers can `await` it the same way
 * they already `await parseRawConfig` — no parsing happens here, the
 * returned string is handed unchanged to the existing parse path
 * (Detection/Normalization stay inside each parser, ANTI_CHAOS Rule 10).
 */

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed to read file"));
    reader.readAsText(file);
  });
}
