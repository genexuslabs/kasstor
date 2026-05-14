import { getBaseSubtag } from "./get-base-subtag";
import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorTranslationShape } from "./types";

/**
 * Returns the loaded translations for the current language and feature.
 *
 * Lookup mirrors the load-time rule in `get-translations-for-language`:
 * prefer the regional bundle (when the feature's loader carried an
 * explicit override) and fall back to the base subtag's bundle
 * otherwise.
 *
 * @param featureId - Feature ID passed to `registerTranslations`.
 * @returns The translation shape for the current language, or `undefined`
 *   when no language is set, the feature has no loaded bundles, or
 *   neither the current tag nor its base subtag has been loaded.
 */
export const getCurrentTranslations = <T extends KasstorTranslationShape>(
  featureId: string
): T | undefined => {
  // Read currentLanguage from inside the function (not destructured outside)
  // so the lookup picks up the latest value after burst language changes.
  const { currentLanguage, loadedTranslations } = getI18nGlobals();
  if (currentLanguage === undefined) {
    return undefined;
  }

  const featureBundle = loadedTranslations.get(featureId);
  if (featureBundle === undefined) {
    return undefined;
  }

  // Prefer an exact regional bundle (e.g. `"es-ES"`); fall back to the
  // base subtag bundle (e.g. `"es"`).
  return (featureBundle.get(currentLanguage) ??
    featureBundle.get(getBaseSubtag(currentLanguage))) as T | undefined;
};
