import { getI18nGlobals } from "./get-i18n-globals.js";

/**
 * Returns the Promise that resolves when the language system has been
 * initialized (first language set and translations loaded).
 *
 * Await this before reading `getCurrentLanguage()` or `getCurrentTranslations()`
 * if you need to ensure setup is complete (e.g. in a top-level app).
 */
export const languageHasBeenInitialized = (): Promise<void> => getI18nGlobals().languageInitialized;
