import { createRecentExportsStore } from "../../core/store/recent-exports-state.js";
import { useStoreSelector } from "./use-store-selector.js";

export const recentExportsStore = createRecentExportsStore();

function selectRecentExports(state: ReturnType<typeof recentExportsStore.getState>) {
  return state;
}

export function useRecentExportsState() {
  return useStoreSelector(recentExportsStore, selectRecentExports);
}
