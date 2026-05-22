// Local declarations for the subset of `@genexus/kasstor-core`'s ambient
// globals that the HMR handler code in this package reads at runtime.
//
// Why a SHIM and not a direct import:
//
//   - The canonical declarations live in
//     `@genexus/kasstor-core/src/typings/global.ts`.
//   - This package depends on `@genexus/kasstor-core` only as a PEER, and
//     none of its source files actually `import` from kasstor-core.
//     Without an import, TypeScript never loads kasstor-core's ambient
//     declarations, so the consumer's `globalThis.kasstor*` accesses fail
//     with `TS7017: Element implicitly has an 'any' type because type
//     'typeof globalThis' has no index signature.`
//   - The CI's pre-build order puts `vite-plugin-kasstor` in Tier 1
//     (before kasstor-core), so kasstor-core's `dist/` is empty when this
//     package's `tsc` runs — even a side-effect import would not be able
//     to resolve the ambient declarations from there.
//   - In the browser at HMR time the actual declarations from kasstor-core
//     are present alongside this code; the runtime types are richer
//     (`Set<KasstorElement>` vs. our generic `Set<HTMLElement>`), but the
//     properties this file actually reads are all on `HTMLElement` /
//     `ShadowRoot`, so the shapes line up at the use sites.

declare global {
  /**
   * Set of custom-element tags whose components have been Hot Module Replaced
   * during the current dev session. Populated by `handleComponentUpdate` and
   * consumed by the `@Component` decorator in `kasstor-core` to suppress
   * "tag already defined" warnings on the second registration.
   */
  // eslint-disable-next-line no-var
  var kasstorCoreHotModuleReplacedComponents: Set<string> | undefined;

  /**
   * Per-tag set of live `KasstorElement` instances, used by the HMR style
   * handler to swap a recompiled stylesheet across every instance without
   * having to query the DOM. Declared here with an `HTMLElement` element
   * type — kasstor-core declares it with `KasstorElement`, which is
   * structurally narrower; the only properties read in this package are
   * inherited from `HTMLElement` (`shadowRoot`).
   */
  // eslint-disable-next-line no-var
  var kasstorCoreRegisteredInstances: Map<string, Set<HTMLElement>> | undefined;
}

// Make this file a module so the `declare global` block is treated as an
// ambient augmentation rather than a script.
export {};
