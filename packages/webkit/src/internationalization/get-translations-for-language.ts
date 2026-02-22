import { getI18nGlobals } from "./get-i18n-globals";
import type { KasstorLanguage } from "./types";

const { loadedTranslations, translationLoaders } = getI18nGlobals();

export const getTranslationsForLanguage = <T extends KasstorLanguage>(language: T) => {
  const loadersForEachFeature: Promise<void>[] = [...translationLoaders.entries()]
    // Load the language translations for each feature in parallel
    .map(async ([featureId, loader]) => {
      const translations = await loader[language]();
      const featureTranslations = loadedTranslations.get(featureId);

      // This feature already has at least one language loaded
      if (featureTranslations !== undefined) {
        featureTranslations.set(language, translations);
      }
      // First translation added for this feature
      else {
        loadedTranslations.set(featureId, new Map([[language, translations]]));
      }
    });

  return Promise.all(loadersForEachFeature);
};
