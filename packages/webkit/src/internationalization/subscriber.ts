import { getCurrentTranslations } from "./get-current-translations";
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
  translationChangeSubscribers.forEach(({ featureId, callback }) =>
    // The translation must be defined, since this function is called after all
    // translations for the language has been loaded
    callback(getCurrentTranslations(featureId)!)
  );

/**
 * Subscribes to language change notifications. When the app language changes,
 * the callback receives the new translations for the given feature.
 *
 * @param featureId - Feature ID whose translations are needed (same ID used in `registerTranslations`).
 * @param callback - Called with the new translation shape when language changes.
 * @returns A unique subscriber ID; pass it to `unsubscribeToLanguageChanges` to remove the subscription.
 *
 * Behavior:
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

  return subscriberId;
};

/**
 * Removes a language change subscription by the ID returned from
 * `subscribeToLanguageChanges`.
 *
 * @param subscriberId - The ID returned when subscribing.
 * @returns `true` if the subscription was removed, `false` if not found.
 */
export const unsubscribeToLanguageChanges = (subscriberId: string): boolean =>
  // There is no need to free the memory for the translationChangeSubscribers
  // Map, because we assume a component/page will always be rendered
  translationChangeSubscribers.delete(subscriberId);
