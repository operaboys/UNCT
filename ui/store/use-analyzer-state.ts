/**
 * The Analyzer State domain's Preact-facing half (mirrors `use-parser-
 * state.ts`'s pattern for its sibling store). `analyzerStore` is the one
 * app-wide instance of `core/store/analyzer-state.js`'s
 * `createAnalyzerStore()` for the running app (tests build their own,
 * independent instances instead — see tests/store/analyzer-state.test.js).
 *
 * `useAnalyzerState()` only reads the whole `analysisByNodeId` map (a
 * stable module-level selector reference); per-node lookup
 * (`selectAnalysisByNodeId`) is applied by the caller over the returned map,
 * the same read-via-hook / write-via-store-action split `use-parser-
 * state.ts` already follows.
 */
import { createAnalyzerStore } from "../../core/store/analyzer-state.js";
import { useStoreSelector } from "./use-store-selector.js";

export const analyzerStore = createAnalyzerStore();

function selectAnalysisByNodeIdMap(state: ReturnType<typeof analyzerStore.getState>) {
  return state.analysisByNodeId;
}

export function useAnalyzerState() {
  return useStoreSelector(analyzerStore, selectAnalysisByNodeIdMap);
}
