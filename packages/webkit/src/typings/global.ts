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
         * A resolver function for the current `languageChangePromise`.
         *
         * When `undefined`, no language change is in flight (the previous
         * promise has already resolved or none has started yet). When a new
         * `setLanguage` call happens with no resolver in flight, a fresh
         * promise + resolver are installed; rapid follow-up `setLanguage`
         * calls reuse the same in-flight resolver so they all share a single
         * `languageChangePromise` that resolves once the *latest* language
         * has finished loading.
         *
         * Only useful for internal purposes.
         */
        internalLanguageChangeResolver?: () => void;

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
         * A promise that resolves when the in-flight language change finishes.
         *
         * - Initially an already-resolved promise (no change pending).
         * - On `setLanguage`, if no change is currently in flight, a fresh
         *   pending promise is installed here (and its resolver in
         *   `internalLanguageChangeResolver`).
         * - When the *latest* language's translations finish loading, the
         *   resolver is called and cleared. Earlier-but-not-latest loads are
         *   ignored, so burst calls don't leak resolution.
         *
         * Mutable across the lifecycle (each completed change is followed by
         * a new pending promise on the next change), so it is intentionally
         * not `readonly`.
         */
        languageChangePromise: Promise<void>;

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
         * Cache of load Promises per language and feature. Deduplicates
         * getTranslationsForLanguage calls so loaders run once per
         * language+feature pair. Individual feature entries are cleared when
         * translationLoaders change (registerTranslations) so new/replaced
         * features are loaded on the next request.
         */
        readonly translationLoadCache: Map<
          KasstorLanguage,
          Map<FeatureIdentifier, Promise<void>>
        >;

        /**
         * Number of active subscribers per feature. Stored on globalThis for
         * easy runtime debugging — inspect `kasstorWebkitI18n.subscriberCounts`
         * in DevTools to identify bottlenecks (features with 0 subscribers that
         * shouldn't be loading, or features with unexpectedly high counts).
         */
        readonly subscriberCounts: Map<FeatureIdentifier, number>;

        /**
         * Features registered with `preloadTranslations: true`. Always loaded
         * regardless of subscriber count. Inspect
         * `kasstorWebkitI18n.preloadFeatures` in DevTools to verify which
         * features bypass lazy loading.
         */
        readonly preloadFeatures: Set<FeatureIdentifier>;
      }
    | undefined;
}

// Necessary to auto-detect this module in the project
// export {};
