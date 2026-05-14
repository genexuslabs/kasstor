// BCP47 §2.2.1: base subtag is 2 or 3 alphabetic chars. The region
// portion accepts 2–8 alphanumerics (BCP47 region or script).
const LANGUAGE_URL_PATTERN =
  /^\/(?<lang>[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)(?:\/.*)?$/;

/**
 * Extracts the language tag from a pathname (e.g. `/es/home` → `"es"`,
 * `/es-AR/home` → `"es-AR"`, `/fil/home` → `"fil"`).
 *
 * @param pathname - Path to parse; defaults to `window.location.pathname` in the browser.
 * @returns The first path segment when it matches the language pattern, or `null`.
 *
 * Behavior:
 * - The returned value is NOT canonicalized — call `normalizeTag` afterwards
 *   to lowercase the base and uppercase the region.
 */
export const getLanguageFromUrl = (pathname?: string): string | null =>
  (pathname ?? window.location.pathname).match(LANGUAGE_URL_PATTERN)?.groups
    ?.lang ?? null;
