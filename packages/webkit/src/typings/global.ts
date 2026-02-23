import type {
  KasstorLanguage,
  KasstorLanguageFullnameAndSubtag,
  KasstorTranslations,
  KasstorTranslationShape,
  KasstorTranslationsLoader
} from "../internationalization/types";

type FeatureIdentifier = string;

declare global {
  var kasstorWebkitI18n:
    | {
        /**
         * This flag help us to avoid race conditions when resolving multiple promises
         * for new translations at the same time.
         */
        currentLanguage: KasstorLanguage | undefined;

        /**
         * A resolver function for the `languageInitialized` promise.
         *
         * When the `internalLanguageInitializedResolver` is `false` it means the
         * initial language has been initialized.
         *
         * Only useful for internal purposes.
         */
        internalLanguageInitializedResolver?: (() => void) | false;

        /**
         * Current translations loaded per feature (e.g. per component or per app).
         */
        readonly loadedTranslations: Map<
          FeatureIdentifier,
          KasstorTranslations<KasstorTranslationShape>
        >;

        /**
         * Called when the language changes by user interaction or by
         * navigating forward/back in the browser, so the Host application
         * can update its UI accordingly.
         */
        languageChangeCallback?: (newLanguage: KasstorLanguageFullnameAndSubtag) => void;

        /**
         * A promise that resolves when the language has been initialized.
         */
        readonly languageInitialized: Promise<void>;

        /**
         * Called when the language changes by user interaction, so the Host
         * application can update its URL.
         */
        locationChangeCallback?: (newLocation: string) => void;

        /**
         * Loaders for the translations of each feature.
         */
        readonly translationLoaders: Map<
          FeatureIdentifier,
          KasstorTranslationsLoader<KasstorTranslationShape>
        >;

        /**
         * Cache of load Promises per language. Deduplicates getTranslationsForLanguage
         * calls so loaders run once per language; cleared when translationLoaders
         * change (registerTranslations) so new features are loaded. Bounded by
         * number of supported languages; no long-lived references to translation data.
         */
        readonly translationLoadCache: Map<KasstorLanguage, Promise<void>>;
      }
    | undefined;
}

// Necessary to auto-detect this module in the project
// export {};
