// @vitest-environment jsdom
/**
 * `readFileAsText` (core/importer/from-file.js) — File Upload's text
 * extraction (07-UI_UX_SYSTEM §4.2). jsdom's `FileReader`/`File` are real
 * enough here: no mocking of the read path itself.
 */
import { describe, it, expect } from "vitest";
import { readFileAsText } from "../../core/importer/from-file.js";

describe("readFileAsText", () => {
  it("resolves with the file's text content", async () => {
    const file = new File(["vless://example#node"], "config.txt", { type: "text/plain" });
    await expect(readFileAsText(file)).resolves.toBe("vless://example#node");
  });

  it("resolves with an empty string for an empty file", async () => {
    const file = new File([], "empty.txt", { type: "text/plain" });
    await expect(readFileAsText(file)).resolves.toBe("");
  });

  it("preserves multi-line content", async () => {
    const text = "line-one\nline-two\nline-three";
    const file = new File([text], "multi.txt", { type: "text/plain" });
    await expect(readFileAsText(file)).resolves.toBe(text);
  });

  it("rejects when FileReader reports an error", async () => {
    const file = new File(["irrelevant"], "broken.txt", { type: "text/plain" });
    const originalReadAsText = FileReader.prototype.readAsText;
    FileReader.prototype.readAsText = function () {
      this.onerror?.(/** @type {ProgressEvent<FileReader>} */ (new ProgressEvent("error")));
    };
    try {
      await expect(readFileAsText(file)).rejects.toBeTruthy();
    } finally {
      FileReader.prototype.readAsText = originalReadAsText;
    }
  });
});
