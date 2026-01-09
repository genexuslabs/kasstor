import { getI18nGlobals } from "./get-i18n-globals";
import { setLanguage } from "./set-language";
import type {
  KasstorTranslationShape,
  KasstorTranslationsLoader
} from "./types";

/**
 * Registers translation loaders for an application
 * @param {string} applicationId - Unique application identifier
 * @param {KasstorTranslationsLoader<T>} loader - Translation loader function
 * @remarks Overwrites existing loaders for HMR compatibility
 */
export const registerTranslations = <T extends KasstorTranslationShape>(
  applicationId: string,
  loader: KasstorTranslationsLoader<T>
) => {
  // Current language is not an object, so it won't be lively updated. That why
  // we can't destructure it outside the function
  const { currentLanguage, translationLoaders } = getI18nGlobals();

  if (translationLoaders.has(applicationId)) {
    console.warn(
      `The translations loader for the application "${applicationId}" has already been registered. This issue can occur when using Hot Module Replacement. Also, validate that your applicationId is unique and your are not registering the translations multiple times.`
    );
  }

  // To improve the DX with HMR, we replace the translations loader anyways
  translationLoaders.set(applicationId, loader);

  // TODO: Add an e2e test for this
  // This is a dummy setLanguage to load the translations for the new application
  if (currentLanguage) {
    setLanguage(currentLanguage);
  }
};

