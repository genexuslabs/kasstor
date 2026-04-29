import { getI18nGlobals } from "./get-i18n-globals.js";

/**
 * Returns a Promise that resolves when the in-flight language change has
 * been fully applied (the latest language's translations have finished
 * loading and subscribers have been notified).
 *
 * Use this to await the completion of a `setLanguage` call. When several
 * `setLanguage` calls happen in burst, the returned Promise only resolves
 * once the *latest* language has loaded — not for any of the intermediate
 * ones — so callers always observe the final language. No artificial delay
 * is applied: cached translations resolve as soon as the loader cache hits.
 *
 * If no change is currently in flight (none has started yet, or the
 * previous one already resolved), the returned Promise is already resolved.
 */
export const languageChangeComplete = (): Promise<void> =>
  getI18nGlobals().languageChangePromise;
