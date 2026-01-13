import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguage } from "./types";

const { loadedTranslations, translationLoaders } = getI18nGlobals();

export const getTranslationsForLanguage = <T extends KasstorLanguage>(
  language: T
) => {
  const loadersForEachApplication: Promise<void>[] = [
    ...translationLoaders.entries()
  ]
    // Load the language translations for each application in parallel
    .map(async ([appId, loader]) => {
      const translations = await loader[language]();
      const appTranslations = loadedTranslations.get(appId);

      // The applications at least has one language translated
      if (appTranslations !== undefined) {
        appTranslations.set(language, translations);
      }
      // It is the first translation added for the application
      else {
        loadedTranslations.set(appId, new Map([[language, translations]]));
      }
    });

  return Promise.all(loadersForEachApplication);
};

