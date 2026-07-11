// @vitest-environment jsdom
/**
 * `extractTextFromDropEvent` (core/importer/from-drop-event.js) —
 * Drag-Drop Zone's text extraction (07-UI_UX_SYSTEM §4.2). jsdom does not
 * implement `DragEvent`/`DataTransfer` (a known jsdom gap), so this builds
 * a plain `Event` with a `dataTransfer.files` shape attached — the only
 * part `extractTextFromDropEvent` actually reads, matching a real
 * browser's `drop` event closely enough for this pure function.
 */
import { describe, it, expect } from "vitest";
import { extractTextFromDropEvent } from "../../core/importer/from-drop-event.js";

/** @param {File[]} files */
function makeDropEvent(files) {
  const event = new Event("drop");
  Object.defineProperty(event, "dataTransfer", {
    value: { files },
  });
  return event;
}

describe("extractTextFromDropEvent", () => {
  it("resolves with the dropped file's text content", async () => {
    const file = new File(["vless://example#node"], "config.txt", { type: "text/plain" });
    const event = makeDropEvent([file]);
    await expect(
      extractTextFromDropEvent(/** @type {DragEvent} */ (event))
    ).resolves.toBe("vless://example#node");
  });

  it("rejects when the drop event carries no file", async () => {
    const event = makeDropEvent([]);
    await expect(
      extractTextFromDropEvent(/** @type {DragEvent} */ (event))
    ).rejects.toThrow("no file");
  });

  it("rejects when dataTransfer itself is missing", async () => {
    const event = new Event("drop");
    await expect(
      extractTextFromDropEvent(/** @type {DragEvent} */ (event))
    ).rejects.toThrow("no file");
  });

  it("only reads the first file when multiple are dropped", async () => {
    const first = new File(["first"], "a.txt", { type: "text/plain" });
    const second = new File(["second"], "b.txt", { type: "text/plain" });
    const event = makeDropEvent([first, second]);
    await expect(
      extractTextFromDropEvent(/** @type {DragEvent} */ (event))
    ).resolves.toBe("first");
  });
});
