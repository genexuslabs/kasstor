import { getI18nGlobals } from "./get-i18n-globals.js";

/**
 * Returns a Promise that is resolved when the language has been initialized.
 *
 * Useful to await for the language to have been fully set up before proceeding.
 */
export const languageHasBeenInitialized = () =>
  getI18nGlobals().languageInitialized;

