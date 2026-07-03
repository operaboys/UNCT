/**
 * Template Library's Preact-facing half (ADR-015 Decision point 2), mirroring
 * `use-parser-state.ts` exactly. `templateLibraryStore` is the one app-wide
 * instance of `core/store/template-state.js`'s `createTemplateLibraryStore()`
 * for the running app.
 *
 * `useTemplateState()` only reads (`selectAllTemplates`, a stable module-
 * level reference). Writes go through `templateLibraryStore`'s own
 * `addTemplate`/`removeTemplate`/`clearTemplates` directly, called from event
 * handlers.
 */
import { createTemplateLibraryStore } from "../../core/store/template-state.js";
import { selectAllTemplates } from "../../core/store/selectors.js";
import { useStoreSelector } from "./use-store-selector.js";

export const templateLibraryStore = createTemplateLibraryStore();

export function useTemplateState() {
  return useStoreSelector(templateLibraryStore, selectAllTemplates);
}
