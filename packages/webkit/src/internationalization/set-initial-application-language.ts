import { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag";
import { getClientLanguage } from "./get-client-language";
import { getI18nGlobals } from "./get-i18n-globals";
import { getLanguageFromUrl } from "./get-language-from-url";
import { isValidLanguage } from "./is-valid-language";
import { setLanguage } from "./set-language";
import { trackLanguageChangesWithForwardAndBackwardNavigation } from "./track-langauge-changes-with-forward-and-backward-navigation";
import type { KasstorLanguageFullnameAndSubtag } from "./types";

/**
 * Sets the initial application language based on the URL or client preferences.
 * @param options - Configuration options
 * @param options.locationChangeCallback - Callback to update the URL when the language changes.
 * @param options.pathname - Optional pathname to extract the language from. If not provided, the function will use the current window location.
 * @throws Will throw an error if called on the server without a pathname.
 * @returns The initial language set for the application and the location to replace if the URL must be updated.
 */
export const setInitialApplicationLanguage = (options: {
  languageChangeCallback?: (
    newLanguage: KasstorLanguageFullnameAndSubtag
  ) => void;
  locationChangeCallback: (newLocation: string) => void;
  pathname?: string;
}): {
  initialLanguage: KasstorLanguageFullnameAndSubtag;
  locationToReplace: string | undefined;
} => {
  const { languageChangeCallback, locationChangeCallback, pathname } = options;

  if (pathname === undefined && typeof window === "undefined") {
    throw new Error(
      '"setInitialApplicationLanguage" requires a pathname when called in the server'
    );
  }

  const languageFromUrl = getLanguageFromUrl(pathname);
  const initialLanguage = isValidLanguage(languageFromUrl)
    ? languageFromUrl
    : getClientLanguage();

  // Side effect to initialize the i18n globals if not already done
  getI18nGlobals();
  kasstorWebkitI18n!.languageChangeCallback = languageChangeCallback;
  kasstorWebkitI18n!.locationChangeCallback = locationChangeCallback;

  const initialLocation = setLanguage(initialLanguage, false);

  trackLanguageChangesWithForwardAndBackwardNavigation();

  return {
    initialLanguage: fromLanguageToFullnameAndSubtag(initialLanguage),
    locationToReplace: initialLocation
  };
};

