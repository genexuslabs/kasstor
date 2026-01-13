import { getCurrentTranslations } from "./get-current-translations";
import type { KasstorTranslationShape } from "./types";

let autoSubscriberId = 0;

// This Map is always allocated, because we assume a component/page will
// always be rendered
const translationChangeSubscribers: Map<
  string,
  {
    applicationId: string;
    callback: (newTranslation: KasstorTranslationShape) => void;
  }
> = new Map();

export const notifyLanguageChange = () =>
  translationChangeSubscribers.forEach(({ applicationId, callback }) =>
    // The translation must be defined, since this function is called after all
    // translations for the language has been loaded
    callback(getCurrentTranslations(applicationId)!)
  );

/**
 * Subscribes to language change notifications
 * @param {string} applicationId - Application/component ID needing translations
 * @param {(newTranslation: KasstorTranslationShape) => void} callback - Function to call when translations update
 * @returns A unique identifier for the subscriber which must be stored for later calls to `unsubscribeToLanguageChanges`
 */
export const subscribeToLanguageChanges = (
  applicationId: string,
  callback: (newTranslation: KasstorTranslationShape) => void
) => {
  const subscriberId = `kasstor-webkit-i18n-subscriber-${autoSubscriberId++}`;
  translationChangeSubscribers.set(subscriberId, { applicationId, callback });

  return subscriberId;
};

/**
 * Removes a language change subscription
 * @param {string} subscriberId - ID of the subscriber to remove
 * @returns {boolean} True if subscription was removed, false if not found
 */
export const unsubscribeToLanguageChanges = (subscriberId: string) =>
  // There is no need to free the memory for the translationChangeSubscribers
  // Map, because we assume a component/page will always be rendered
  translationChangeSubscribers.delete(subscriberId);

