import { DEV_MODE } from "../development-flags.js";
import { DEFAULT_LANGUAGE } from "./default-language.js";
import { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag.js";
import { getI18nGlobals } from "./get-i18n-globals.js";
import { normalizeAvailableLanguages } from "./normalize-available-languages.js";
import type { KasstorLanguage, KasstorLanguageSubtag } from "./types";

/**
 * Applies host-provided `availableLanguages` / `defaultLanguage` configuration
 * to the i18n globals.
 *
 * Shared by `setInitialApplicationLanguage` (init-time) and
 * `setAvailableLanguages` (runtime).
 *
 * Behavior:
 * - When `availableLanguages` is provided, it is normalized (full names →
 *   subtags, "en" guaranteed unless `strict` is `true`) and written to
 *   globals.
 * - When `defaultLanguage` is provided, it is normalized to a subtag and
 *   written to globals; if it is not in the (effective) `availableLanguages`,
 *   it is coerced to "en" with a warning in `DEV_MODE`.
 * - When `availableLanguages` is provided **without** `defaultLanguage`, any
 *   previously-configured `defaultLanguage` that is no longer in the new set
 *   is also coerced to "en" with a warning in `DEV_MODE`.
 * - When `strict` is `true`, `normalizeAvailableLanguages` skips its
 *   "auto-add `en`" safety fallback so the resulting set matches the host's
 *   list exactly.
 */
export const applyI18nConfig = (config: {
  availableLanguages?: ReadonlyArray<KasstorLanguage | KasstorLanguageSubtag>;
  defaultLanguage?: KasstorLanguage | KasstorLanguageSubtag;
  strict?: boolean;
}) => {
  // Side effect to initialize the i18n globals if not already done.
  getI18nGlobals();

  if (config.availableLanguages !== undefined) {
    kasstorWebkitI18n!.availableLanguages = normalizeAvailableLanguages(
      config.availableLanguages,
      config.strict
    );
  }

  const effectiveAvailable = kasstorWebkitI18n!.availableLanguages;

  if (config.defaultLanguage !== undefined) {
    const defaultSubtag = fromLanguageToFullnameAndSubtag(config.defaultLanguage).subtag;
    if (effectiveAvailable !== undefined && !effectiveAvailable.has(defaultSubtag)) {
      if (DEV_MODE) {
        console.warn(
          `[kasstor i18n] "defaultLanguage" "${defaultSubtag}" is not in "availableLanguages"; using "${DEFAULT_LANGUAGE}" instead.`
        );
      }
      kasstorWebkitI18n!.configuredDefaultLanguage = DEFAULT_LANGUAGE;
    } else {
      kasstorWebkitI18n!.configuredDefaultLanguage = defaultSubtag;
    }
  } else if (config.availableLanguages !== undefined) {
    // The host narrowed the available list without re-providing
    // `defaultLanguage`. If the previously-configured default is no longer
    // valid, coerce it to "en" so the resolution chain stays sound.
    const previousDefault: KasstorLanguageSubtag | undefined =
      kasstorWebkitI18n!.configuredDefaultLanguage;
    if (
      previousDefault !== undefined &&
      effectiveAvailable !== undefined &&
      !effectiveAvailable.has(previousDefault)
    ) {
      if (DEV_MODE) {
        console.warn(
          `[kasstor i18n] previously-configured "defaultLanguage" "${previousDefault}" is no longer in "availableLanguages"; using "${DEFAULT_LANGUAGE}" instead.`
        );
      }
      kasstorWebkitI18n!.configuredDefaultLanguage = DEFAULT_LANGUAGE;
    }
  }
};
