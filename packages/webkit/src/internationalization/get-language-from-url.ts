const LANGUAGE_URL_PATTERN = /^\/(?<lang>[a-z]{2})(?:\/.*)?$/;

export const getLanguageFromUrl = (pathname?: string): string | null =>
  (pathname ?? window.location.pathname).match(LANGUAGE_URL_PATTERN)?.groups
    ?.lang ?? null;

