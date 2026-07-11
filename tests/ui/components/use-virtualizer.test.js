/**
 * @vitest-environment jsdom
 *
 * Unit coverage for the viewport/buffer calculation `NodeTable`
 * (`ui/subscription/subscription-screen.tsx`) relies on to avoid the real
 * ~5000-6000-node crash this checkpoint fixes. `use-virtualizer.ts` is a
 * thin Preact wrapper with no logic of its own to unit-test in isolation —
 * what actually needs proving is that `@tanstack/virtual-core`'s
 * `Virtualizer`, configured exactly the way `NodeTable` configures it
 * (`estimateSize`/`overscan`/`getScrollElement`), only ever exposes a small
 * window of indexes around the current scroll position, not the whole
 * list, and that the window tracks a real scroll event to a real middle
 * index. jsdom does not implement `ResizeObserver` or real layout, so
 * `offsetHeight`/`offsetWidth` are stubbed on the container the same way
 * any `@tanstack/virtual-core` test suite stubs them; `observeElementRect`
 * (see `node_modules/@tanstack/virtual-core/dist/esm/index.js`) reads
 * `getRect(element)` synchronously before ever touching `ResizeObserver`,
 * so the stub alone is enough — no ResizeObserver polyfill needed.
 */
import { describe, expect, it } from "vitest";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";

const ROW_HEIGHT = 50;
const OVERSCAN = 5;
const COUNT = 5000;
const VIEWPORT_HEIGHT = 300;

/** @param {number} height @param {number} width */
function makeScrollContainer(height, width = 800) {
  const el = document.createElement("div");
  Object.defineProperty(el, "offsetHeight", { value: height, configurable: true });
  Object.defineProperty(el, "offsetWidth", { value: width, configurable: true });
  document.body.appendChild(el);
  return el;
}

/** @param {HTMLDivElement} container */
function makeVirtualizer(container) {
  const v = new Virtualizer({
    count: COUNT,
    getScrollElement: () => container,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
  });
  // Mirrors use-virtualizer.ts's useLayoutEffect(() => instance._didMount(), [])
  // followed by useLayoutEffect(() => instance._willUpdate()) on first render.
  v._didMount();
  v._willUpdate();
  return v;
}

/** @param {HTMLDivElement} container @param {Virtualizer<any, any>} virtualizer @param {number} offset */
function scrollTo(container, virtualizer, offset) {
  container.scrollTop = offset;
  container.dispatchEvent(new Event("scroll"));
  virtualizer._willUpdate();
}

describe("Subscription Center Node List virtualizer (viewport/buffer calculation)", () => {
  it("computes total scrollable size as count * estimated row height before any real measurement", () => {
    const container = makeScrollContainer(VIEWPORT_HEIGHT);
    const virtualizer = makeVirtualizer(container);

    expect(virtualizer.getTotalSize()).toBe(COUNT * ROW_HEIGHT);
  });

  it("renders only the viewport's visible rows plus the overscan buffer at the top of a 5000-row list, not all 5000", () => {
    const container = makeScrollContainer(VIEWPORT_HEIGHT);
    const virtualizer = makeVirtualizer(container);

    const items = virtualizer.getVirtualItems();
    const expectedVisible = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);

    expect(items.length).toBeGreaterThanOrEqual(expectedVisible);
    // Overscan only extends past the end here (start is already clamped at 0).
    expect(items.length).toBeLessThanOrEqual(expectedVisible + OVERSCAN + 1);
    expect(items.length).toBeLessThan(COUNT);
    expect(items[0].index).toBe(0);
  });

  it("shifts the rendered window to include a real middle-of-list index after a scroll event, without rendering the whole list", () => {
    const container = makeScrollContainer(VIEWPORT_HEIGHT);
    const virtualizer = makeVirtualizer(container);

    const middleIndex = 2500;
    scrollTo(container, virtualizer, middleIndex * ROW_HEIGHT);

    const items = virtualizer.getVirtualItems();
    const indexes = items.map((item) => item.index);

    expect(indexes).toContain(middleIndex);
    expect(items.length).toBeLessThan(COUNT);
    // The buffer window stays tight around the scroll position, not the whole list.
    expect(Math.min(...indexes)).toBeGreaterThan(middleIndex - 50);
    expect(Math.max(...indexes)).toBeLessThan(middleIndex + 50);
  });

  it("clamps the overscan buffer at the end of the list — no index reaches past count - 1", () => {
    const container = makeScrollContainer(VIEWPORT_HEIGHT);
    const virtualizer = makeVirtualizer(container);

    scrollTo(container, virtualizer, (COUNT - 1) * ROW_HEIGHT);

    const items = virtualizer.getVirtualItems();
    for (const item of items) {
      expect(item.index).toBeGreaterThanOrEqual(0);
      expect(item.index).toBeLessThan(COUNT);
    }
    expect(items[items.length - 1].index).toBe(COUNT - 1);
  });

  it("clamps the overscan buffer at the start of the list — no negative index even with a large overscan", () => {
    const container = makeScrollContainer(VIEWPORT_HEIGHT);
    const virtualizer = makeVirtualizer(container);

    scrollTo(container, virtualizer, 0);

    const items = virtualizer.getVirtualItems();
    expect(items[0].index).toBe(0);
    for (const item of items) {
      expect(item.index).toBeGreaterThanOrEqual(0);
    }
  });
});
