import { createNodeTagsStore } from "../../core/store/node-tags-state.js";
import { useStoreSelector } from "./use-store-selector.js";

export const nodeTagsStore = createNodeTagsStore();

function selectNodeTags(state: ReturnType<typeof nodeTagsStore.getState>) {
  return state;
}

export function useNodeTagsState() {
  return useStoreSelector(nodeTagsStore, selectNodeTags);
}
