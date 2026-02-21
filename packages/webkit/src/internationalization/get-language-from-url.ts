const LANGUAGE_URL_PATTERN = /^\/(?<lang>[a-z]{2})(?:\/.*)?$/;

/**
 * Extracts the language subtag from a pathname (e.g. `/es/home` → `"es"`).
 *
 * @param pathname - Path to parse; defaults to `window.location.pathname` in the browser.
 * @returns The two-letter language segment, or `null` if the path does not match.
 *
 * Behavior:
 * - Expects the first path segment to be a two-letter language code.
 */
export const getLanguageFromUrl = (pathname?: string): string | null =>
  (pathname ?? window.location.pathname).match(LANGUAGE_URL_PATTERN)?.groups?.lang ?? null;
