/**
 * Tracks a real DOM element's content-box width via `ResizeObserver` — used
 * by the Export Center's QR Pagination (`ui/export/qr-pagination.ts`) to
 * compute a page size from `.qr-grid`'s ACTUAL rendered width instead of a
 * fixed constant, so the page size reacts to a real container-width change
 * (window resize on desktop, portrait/landscape rotation on mobile) the
 * same way it reacts to a different viewport at first load. `ResizeObserver`
 * is a standard Web API already implicitly relied on elsewhere in this app
 * (`@tanstack/virtual-core`'s own `observeElementRect`, used by
 * `use-virtualizer.ts`) — no new dependency.
 *
 * Callback-ref shaped (not `useRef` + a separate effect) so it re-attaches
 * cleanly if the underlying element instance ever changes, and disconnects
 * the previous observer instead of leaking it.
 */
import { useLayoutEffect, useRef, useState } from "preact/hooks";

/** `null` until the element has been measured for the first time. */
export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number | null] {
  const [width, setWidth] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  function setRef(el: T | null) {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    observerRef.current = observer;
  }

  useLayoutEffect(() => () => observerRef.current?.disconnect(), []);

  return [setRef, width];
}
