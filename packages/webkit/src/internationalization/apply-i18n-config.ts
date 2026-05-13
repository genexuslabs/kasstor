import { DEV_MODE } from "../development-flags.js";
import { DEFAULT_LANGUAGE } from "./default-language.js";
import { getI18nGlobals } from "./get-i18n-globals.js";
import { isLanguageAvailable } from "./is-language-available.js";
import { normalizeAvailableLanguages } from "./normalize-available-languages.js";
import { normalizeTag } from "./normalize-tag.js";
import type { KasstorLanguageTag } from "./types";

/**
 * Applies host-provided `availableLanguages` / `defaultLanguage` configuration
 * to the i18n globals.
 *
 * Shared by `setInitialApplicationLanguage` (init-time) and
 * `setAvailableLanguages` (runtime).
 *
 * Behavior:
 * - When `availableLanguages` is provided, it is normalized (canonicalized
 *   per entry; `"en"` guaranteed unless `strict` is `true`) and written to
 *   globals.
 * - When `defaultLanguage` is provided, it is normalized and written to
 *   globals; if it is not in the (effective) `availableLanguages`, it is
 *   coerced to `"en"` with a warning in `DEV_MODE`.
 * - When `availableLanguages` is provided **without** `defaultLanguage`, any
 *   previously-configured `defaultLanguage` that is no longer valid is also
 *   coerced to `"en"` with a warning in `DEV_MODE`.
 * - When `strict` is `true`, the auto-add `"en"` safety fallback in
 *   `normalizeAvailableLanguages` is skipped.
 */
export const applyI18nConfig = (config: {
  availableLanguages?: ReadonlyArray<KasstorLanguageTag>;
  defaultLanguage?: KasstorLanguageTag;
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

  if (config.defaultLanguage !== undefined) {
    const canonical = normalizeTag(config.defaultLanguage);
    if (canonical === undefined) {
      if (DEV_MODE) {
        console.warn(
          `[kasstor i18n] "defaultLanguage" "${String(config.defaultLanguage)}" is not a supported tag; using "${DEFAULT_LANGUAGE}" instead.`
        );
      }
      kasstorWebkitI18n!.configuredDefaultLanguage = DEFAULT_LANGUAGE;
    } else if (
      kasstorWebkitI18n!.availableLanguages !== undefined &&
      !isLanguageAvailable(canonical)
    ) {
      if (DEV_MODE) {
        console.warn(
          `[kasstor i18n] "defaultLanguage" "${canonical}" is not in "availableLanguages"; using "${DEFAULT_LANGUAGE}" instead.`
        );
      }
      kasstorWebkitI18n!.configuredDefaultLanguage = DEFAULT_LANGUAGE;
    } else {
      kasstorWebkitI18n!.configuredDefaultLanguage = canonical;
    }
  } else if (config.availableLanguages !== undefined) {
    // The host narrowed the available list without re-providing
    // `defaultLanguage`. If the previously-configured default is no longer
    // valid under wildcard-by-base matching, coerce it to "en".
    const previousDefault = kasstorWebkitI18n!.configuredDefaultLanguage;
    if (
      previousDefault !== undefined &&
      !isLanguageAvailable(previousDefault)
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
