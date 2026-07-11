/**
 * Preact bridge for `@tanstack/virtual-core` (doc 14 §1/§2's Virtual List
 * row, resolved 2026-07-05 after a real ~5000-6000-node import crashed the
 * Subscription Center tab — `NodeTable` was rendering the entire node array
 * with plain Preact `.map()`). `@tanstack/virtual-core` was chosen over
 * `virtua` and `preact-virtual-list` specifically because it has ZERO
 * framework dependency (not even React) — its `peerDependencies` list
 * react/vue/solid/svelte only for its OWN optional adapter subpaths
 * (`@tanstack/virtual-core` itself, the plain `Virtualizer` class this file
 * wraps, depends on nothing). That means no `preact/compat` shim is needed
 * at all, unlike `virtua`'s main export which peer-depends on
 * `react`/`react-dom` directly. `preact-virtual-list` was rejected outright
 * per doc 14's "Actively Maintained" criterion — its last publish was
 * 2022-06-24, four years stale.
 *
 * This hook is a direct, minimal port of the same
 * `useVirtualizerBase`/`_didMount`/`_willUpdate` wiring
 * `@tanstack/react-virtual` itself uses — Preact's `preact/hooks` exports
 * the same `useState`/`useLayoutEffect`/`useReducer` primitives React does,
 * so the port needed no new dependency, just this ~30-line file. `core/`
 * never imports this (Rule 11) — it lives in `ui/components/`, a pure
 * rendering concern.
 */
import { useLayoutEffect, useState } from "preact/hooks";
import type { PartialKeys, VirtualizerOptions } from "@tanstack/virtual-core";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";

type ElementVirtualizerOptions<TScrollElement extends Element, TItemElement extends Element> = PartialKeys<
  VirtualizerOptions<TScrollElement, TItemElement>,
  "observeElementRect" | "observeElementOffset" | "scrollToFn"
>;

/** Mirrors `@tanstack/react-virtual`'s own `useVirtualizer` (element-scrolled,
 * as opposed to `useWindowVirtualizer`) — supplies the three DOM-element
 * observer/scroll functions `@tanstack/virtual-core` exports, so callers
 * only need to pass `count`/`getScrollElement`/`estimateSize`. */
export function useVirtualizer<TScrollElement extends Element, TItemElement extends Element>(
  options: ElementVirtualizerOptions<TScrollElement, TItemElement>,
): Virtualizer<TScrollElement, TItemElement> {
  const [, setTick] = useState(0);
  const rerender = () => setTick((c) => c + 1);

  const resolvedOptions: VirtualizerOptions<TScrollElement, TItemElement> = {
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options,
    onChange: (instance, sync) => {
      options.onChange?.(instance, sync);
      rerender();
    },
  };

  const [instance] = useState(() => new Virtualizer(resolvedOptions));
  instance.setOptions(resolvedOptions);

  useLayoutEffect(() => instance._didMount(), []);
  useLayoutEffect(() => {
    instance._willUpdate();
  });

  return instance;
}
