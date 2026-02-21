import { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag";
import { getClientLanguage } from "./get-client-language";
import { getI18nGlobals } from "./get-i18n-globals";
import { getLanguageFromUrl } from "./get-language-from-url";
import { isValidLanguage } from "./is-valid-language";
import { setLanguage } from "./set-language";
import { trackLanguageChangesWithForwardAndBackwardNavigation } from "./track-langauge-changes-with-forward-and-backward-navigation";
import type { KasstorLanguageFullnameAndSubtag } from "./types";

/**
 * Sets the initial application language from the URL or client preferences, and
 * wires callbacks for future language and location changes.
 *
 * @param options - Configuration.
 * @param options.locationChangeCallback - Called with the new pathname when the
 *   language (and thus URL) changes. Invoke your app's or framework's navigation
 *   here (e.g. React Router's `navigate`, Angular router, Vue Router, or
 *   `history.replaceState`), so the URL reflects the new language.
 * @param options.languageChangeCallback - Optional; called with the new
 *   language when it changes.
 * @param options.pathname - Pathname to read the language from (e.g. `/es/home`).
 *   When running in the browser and not using server-side rendering, omit this:
 *   the current window location is used. When running on the server (SSR), this
 *   is required because `window` is undefined; if omitted on the server, the
 *   function throws.
 * @returns `{ initialLanguage, locationToReplace }` — the language that was set
 *   and the pathname to replace in the URL, if any.
 * @throws Error if called on the server without providing `pathname`.
 *
 * Behavior:
 * - Resolves initial language from URL, then client preferences, then default.
 * - Calls `setLanguage` with that language (without updating the URL).
 * - Enables tracking of language changes for forward/back navigation.
 */
export const setInitialApplicationLanguage = (options: {
  languageChangeCallback?: (newLanguage: KasstorLanguageFullnameAndSubtag) => void;
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
  const initialLanguage = isValidLanguage(languageFromUrl) ? languageFromUrl : getClientLanguage();

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
