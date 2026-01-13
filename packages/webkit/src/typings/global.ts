import type {
  KasstorLanguage,
  KasstorLanguageFullnameAndSubtag,
  KasstorTranslations,
  KasstorTranslationShape,
  KasstorTranslationsLoader
} from "../internationalization/types";

type ApplicationIdentifier = string;

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
         * Represents the current translations loaded for each "application".
         */
        readonly loadedTranslations: Map<
          ApplicationIdentifier,
          KasstorTranslations<KasstorTranslationShape>
        >;

        /**
         * Called when the language changes by user interaction or by
         * navigating forward/back in the browser, so the Host application
         * can update its UI accordingly.
         */
        languageChangeCallback?: (
          newLanguage: KasstorLanguageFullnameAndSubtag
        ) => void;

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
         * Loaders for the translations of each applications.
         */
        readonly translationLoaders: Map<
          ApplicationIdentifier,
          KasstorTranslationsLoader<KasstorTranslationShape>
        >;
      }
    | undefined;
}

// Necessary to auto-detect this module in the project
// export {};

