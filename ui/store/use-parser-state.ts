/**
 * The Parser/Validation State domain's Preact-facing half (ADR-015 Decision
 * point 2 — `useParserState()` lives here, never in `core/`). `parserStore`
 * is the one app-wide instance of `core/store/parser-state.js`'s
 * `createParserStore()` for the running app (tests build their own,
 * independent instances instead — see tests/store/parser-state.test.js).
 *
 * `useParserState()` only reads (`selectAllNodes`, a stable module-level
 * reference — no memoization needed at this call site, see
 * use-store-selector.ts). Writes go through `parserStore`'s own
 * `setNodes`/`addNode`/`updateNode`/`clearNodes` directly, called from
 * event handlers — the same read-via-hook / write-via-store-action split
 * `core/store/parser-state.js`'s tests already exercise.
 */
import { createParserStore } from "../../core/store/parser-state.js";
import { selectAllNodes } from "../../core/store/selectors.js";
import { useStoreSelector } from "./use-store-selector.js";

export const parserStore = createParserStore();

export function useParserState() {
  return useStoreSelector(parserStore, selectAllNodes);
}
