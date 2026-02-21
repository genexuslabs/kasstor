/**
 * Shared local storage keys used by webkit features (e.g. i18n).
 *
 * Use these constants instead of string literals so keys stay consistent
 * across the application and with the package’s internals.
 */
export const SHARED_LOCAL_STORAGE_KEYS = {
  /**
   * Key where the last selected language (subtag) is stored.
   */
  LANGUAGE: "kasstor-webkit__language"
} as const;
