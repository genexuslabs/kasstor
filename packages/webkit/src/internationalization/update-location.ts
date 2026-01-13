import { getI18nGlobals } from "./get-i18n-globals";
import { isValidLanguage } from "./is-valid-language";
import type { KasstorLanguageFullnameAndSubtag } from "./types";

/**
 * Updates the browser's URL to include the specified language subtag.
 * @param language - The language to set in the URL
 * @param executeLocationChange -
 * @returns The new location pathname if it was updated, otherwise undefined
 */
export const updateLocation = (
  language: KasstorLanguageFullnameAndSubtag,
  executeLocationChange = true
): string | undefined => {
  const { subtag } = language;
  const { languageChangeCallback, locationChangeCallback } = getI18nGlobals();

  if (languageChangeCallback) {
    languageChangeCallback(language);
  }

  // TODO: This error must only be shown in development mode
  if (locationChangeCallback === undefined) {
    console.error(
      "The locationChangeCallback is not defined. Please, verify that you called 'setInitialApplicationLanguage' correctly."
    );
    return undefined;
  }

  const { pathname, search, hash } = window.location;
  const pathSegments = pathname.split("/").filter(Boolean); // Filter out empty segments

  // Check if the first segment is a language subtag
  if (pathSegments.length > 0 && pathSegments[0] === subtag) {
    return undefined; // No need to update the URL if the language is already set
  }

  // If the first segment is a valid language subtag, replace it
  if (pathSegments.length > 0 && isValidLanguage(pathSegments[0])) {
    pathSegments[0] = subtag;
  } else {
    // Otherwise, add the language subtag at the beginning
    pathSegments.unshift(subtag);
  }

  const newPathname = "/" + pathSegments.join("/");

  // If the location was changed with backward or forward navigation,
  // we don't need to update the URL again. Otherwise, we would create
  // an infinite loop of URL updates.
  if (executeLocationChange) {
    // Use the router of the Host application instead of the history API to,
    // change the URL to avoid full page reloads and to keep the routing state
    // when navigating through the application (back/forward).
    locationChangeCallback(`${newPathname}${search}${hash}`);
  }

  return newPathname;
};

