import type { ThemePromiseResolver } from "../typings/internal-types";

/**
 * Alias to improve minification
 */
const global = globalThis;

// Side effect to initialize the style-sheet caches if they're not already
// initialized. Backing them with `globalThis` keeps a single shared instance
// per page (so HMR boundaries and multiple `@genexus/kasstor-design-system`
// copies converge on the same caches), and lets test code reset the caches
// without needing a dedicated public API.
global.geneXusDesignSystemsStyleSheets ??= new Map<string, CSSStyleSheet>();
global.geneXusDesignSystemsStyleSheetPromises ??= new Map<string, ThemePromiseResolver>();

/**
 * Returns the cache of `CSSStyleSheet` instances keyed by theme name.
 * Populated by `setStyleSheetMapping` once a bundle resolves successfully.
 */
export const getStyleSheetCache = () => global.geneXusDesignSystemsStyleSheets!;

/**
 * Returns the cache of in-flight `getStyleSheetPromiseInfo` entries keyed by
 * theme name. Used to dedupe concurrent fetches for the same theme.
 */
export const getStyleSheetPromiseCache = () => global.geneXusDesignSystemsStyleSheetPromises!;
