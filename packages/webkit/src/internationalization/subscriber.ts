import { getCurrentTranslations } from "./get-current-translations";
import { getI18nGlobals } from "./get-i18n-globals";
import { ensureFeatureTranslationsLoaded } from "./get-translations-for-language";
import type { KasstorTranslationShape } from "./types";

let autoSubscriberId = 0;

// This Map is always allocated, because we assume a component/page will
// always be rendered
const translationChangeSubscribers: Map<
  string,
  {
    featureId: string;
    callback: (newTranslation: KasstorTranslationShape) => void;
  }
> = new Map();

export const notifyLanguageChange = () =>
  translationChangeSubscribers.forEach(({ featureId, callback }) => {
    // Defensive guard: translations may be undefined if a subscriber was
    // added mid-flight and its feature hasn't loaded yet. The TS `!`
    // assertion is erased at runtime, so this explicit check is strictly
    // better — it prevents callbacks from receiving undefined as argument.
    const translations = getCurrentTranslations(featureId);
    if (translations !== undefined) {
      callback(translations);
    }
  });

/**
 * Subscribes to language change notifications. When the app language changes,
 * the callback receives the new translations for the given feature.
 *
 * @param featureId - Feature ID whose translations are needed (same ID used in `registerTranslations`).
 * @param callback - Called with the new translation shape when language changes.
 * @returns A unique subscriber ID; pass it to `unsubscribeToLanguageChanges` to remove the subscription.
 *
 * Behavior:
 * - Increments the subscriber count for the feature in the global state.
 * - If the current language is already set, triggers on-demand loading of
 *   this feature's translations (using per-feature cache — no duplicate
 *   requests) and notifies this subscriber when loading completes.
 * - Callback runs after translations for the new language are loaded.
 * - Store the returned ID and call `unsubscribeToLanguageChanges(id)` in
 *   `disconnectedCallback` (or equivalent) to avoid leaks.
 */
export const subscribeToLanguageChanges = (
  featureId: string,
  callback: (newTranslation: KasstorTranslationShape) => void
): string => {
  const subscriberId = `kasstor-webkit-i18n-subscriber-${autoSubscriberId++}`;
  translationChangeSubscribers.set(subscriberId, { featureId, callback });

  const { subscriberCounts, currentLanguage: languageAtSubscription } = getI18nGlobals();
  const previousCount = subscriberCounts.get(featureId) ?? 0;
  subscriberCounts.set(featureId, previousCount + 1);

  // Ensure translations are loaded for this feature. Uses per-feature cache,
  // so no duplicate requests even if multiple subscribers trigger this path.
  const loadPromise = ensureFeatureTranslationsLoaded(featureId);
  if (loadPromise !== undefined) {
    loadPromise.then(() => {
      // Guard 1: subscriber still exists (could have unsubscribed during load)
      // Guard 2: language hasn't changed since subscription (prevents stale notifications)
      if (
        translationChangeSubscribers.has(subscriberId) &&
        getI18nGlobals().currentLanguage === languageAtSubscription
      ) {
        const translations = getCurrentTranslations(featureId);
        if (translations !== undefined) {
          callback(translations);
        }
      }
    });
  }

  return subscriberId;
};

/**
 * Removes a language change subscription by the ID returned from
 * `subscribeToLanguageChanges`.
 *
 * @param subscriberId - The ID returned when subscribing.
 * @returns `true` if the subscription was removed, `false` if not found.
 */
export const unsubscribeToLanguageChanges = (subscriberId: string): boolean => {
  const entry = translationChangeSubscribers.get(subscriberId);
  if (entry === undefined) {
    return false;
  }

  translationChangeSubscribers.delete(subscriberId);

  // Decrement subscriber count for this feature
  const { subscriberCounts } = getI18nGlobals();
  const count = subscriberCounts.get(entry.featureId) ?? 0;
  subscriberCounts.set(entry.featureId, count > 1 ? count - 1 : 0);

  return true;
};
