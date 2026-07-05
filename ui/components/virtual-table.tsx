/**
 * Reusable virtualized `<table>` body (doc 14 §1/§2, extended 2026-07-05
 * after Export Center + Developer Console were found still rendering plain
 * Preact `.map()` over their full arrays — the exact pattern that crashed
 * Subscription Center before the Virtual List checkpoint, just never
 * applied to these two screens). Factors out `ui/subscription/
 * subscription-screen.tsx`'s `NodeTable` wiring (`use-virtualizer.ts` +
 * the spacer-`<tr>` technique) into a generic component so any simple
 * "N rows, M columns" table can opt in without re-deriving the same
 * `paddingTop`/`paddingBottom` math each time. `NodeTable` itself is left
 * untouched (already shipped, already tested, its per-row markup is far
 * more than a plain `<td>` sequence) — this is for the NEWLY-virtualized
 * DevConsole tables.
 */
import { useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { useVirtualizer } from "./use-virtualizer.js";

const DEFAULT_ROW_ESTIMATE_HEIGHT = 44;
const DEFAULT_OVERSCAN = 12;

/**
 * @template T
 */
export function VirtualTable<T>({
  items,
  columnCount,
  header,
  renderRow,
  estimateSize = DEFAULT_ROW_ESTIMATE_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
}: {
  items: readonly T[];
  columnCount: number;
  header: ComponentChildren;
  renderRow: (item: T, index: number) => ComponentChildren;
  estimateSize?: number;
  overscan?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div class="table-scroll table-scroll--virtual" ref={scrollRef}>
      <table class="data-table">
        <thead>{header}</thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true"><td style={{ height: `${paddingTop}px`, padding: 0, border: "none" }} colSpan={columnCount} /></tr>
          )}
          {virtualRows.map((virtualRow) => (
            <tr key={virtualRow.index} ref={rowVirtualizer.measureElement} data-index={virtualRow.index}>
              {renderRow(items[virtualRow.index], virtualRow.index)}
            </tr>
          ))}
          {paddingBottom > 0 && (
            <tr aria-hidden="true"><td style={{ height: `${paddingBottom}px`, padding: 0, border: "none" }} colSpan={columnCount} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
