import { getI18nGlobals } from "./get-i18n-globals";
import { isValidLanguage } from "./is-valid-language";
import type { KasstorLanguageTag } from "./types";

/**
 * Updates the browser's URL to include the specified language tag and fires
 * the host-provided callbacks.
 *
 * @param tag - The language tag to set in the URL.
 * @param executeLocationChange - When `true` (default), invokes
 *   `locationChangeCallback`. Set to `false` for the initial `setLanguage`
 *   to avoid double-navigation.
 * @returns The new pathname if the location was updated, otherwise `undefined`.
 */
export const updateLocation = (
  tag: KasstorLanguageTag,
  executeLocationChange = true
): string | undefined => {
  const { languageChangeCallback, locationChangeCallback } = getI18nGlobals();

  if (languageChangeCallback) {
    languageChangeCallback(tag);
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

  // No-op when the first segment already matches.
  if (pathSegments.length > 0 && pathSegments[0] === tag) {
    return undefined;
  }

  // Replace an existing language segment, or prepend one.
  if (pathSegments.length > 0 && isValidLanguage(pathSegments[0])) {
    pathSegments[0] = tag;
  } else {
    pathSegments.unshift(tag);
  }

  const newPathname = "/" + pathSegments.join("/");
  const newLocation = `${newPathname}${search}${hash}`;

  // If the location was changed with backward or forward navigation, we
  // don't update the URL again — otherwise we'd loop.
  if (executeLocationChange) {
    locationChangeCallback(newLocation);
  }

  return newLocation;
};
