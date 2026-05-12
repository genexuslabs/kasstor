import { applyI18nConfig } from "./apply-i18n-config.js";
import { fromLanguageToFullnameAndSubtag } from "./from-language-to-fullname-and-subtag.js";
import { getClientLanguage } from "./get-client-language.js";
import { getLanguageFromUrl } from "./get-language-from-url.js";
import { isLanguageAvailable } from "./is-language-available.js";
import { isValidLanguage } from "./is-valid-language.js";
import { setLanguage } from "./set-language.js";
import { trackLanguageChangesWithForwardAndBackwardNavigation } from "./track-langauge-changes-with-forward-and-backward-navigation.js";
import type {
  KasstorLanguage,
  KasstorLanguageFullnameAndSubtag,
  KasstorLanguageSubtag
} from "./types";

/**
 * Sets the initial application language from the URL or client preferences, and
 * wires callbacks for future language and location changes.
 *
 * @param options - Configuration.
 * @param options.availableLanguages - Optional list of language subtags (or
 *   full names) the host application exposes to end users. When provided,
 *   resolution from URL, localStorage and `navigator.languages` is filtered
 *   through this list. By default, `"en"` is always added if missing (with a
 *   warning in `DEV_MODE`) so there is always a safe fallback; pass
 *   `strict: true` to skip that auto-addition. `setLanguage` is **not**
 *   gated by this list — hosts can still force any registered language.
 * @param options.defaultLanguage - Optional default language used as the
 *   ultimate fallback when no source resolves to an available language. If
 *   not present in `availableLanguages` (e.g. left out by mistake), it is
 *   coerced to `"en"` with a warning in `DEV_MODE`.
 * @param options.strict - When `true`, kasstor honors the provided
 *   `availableLanguages` list verbatim and does not auto-add `"en"`. Use
 *   this when the host explicitly wants to forbid `"en"`. Defaults to
 *   `false` for backwards compatibility.
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
 * - URL-encoded languages outside `availableLanguages` are treated as invalid
 *   (the resolution falls back to `getClientLanguage`).
 * - Calls `setLanguage` with that language (without updating the URL).
 * - Enables tracking of language changes for forward/back navigation.
 */
export const setInitialApplicationLanguage = (options: {
  availableLanguages?: ReadonlyArray<KasstorLanguage | KasstorLanguageSubtag>;
  defaultLanguage?: KasstorLanguage | KasstorLanguageSubtag;
  languageChangeCallback?: (newLanguage: KasstorLanguageFullnameAndSubtag) => void;
  locationChangeCallback: (newLocation: string) => void;
  pathname?: string;
  strict?: boolean;
}): {
  initialLanguage: KasstorLanguageFullnameAndSubtag;
  locationToReplace: string | undefined;
} => {
  const {
    availableLanguages,
    defaultLanguage,
    languageChangeCallback,
    locationChangeCallback,
    pathname,
    strict
  } = options;

  if (pathname === undefined && typeof window === "undefined") {
    throw new Error(
      '"setInitialApplicationLanguage" requires a pathname when called in the server'
    );
  }

  // Apply host-provided i18n config (and initialize globals as a side effect)
  // before resolving the initial language so the resolution helpers see the
  // configured availableLanguages / defaultLanguage.
  applyI18nConfig({ availableLanguages, defaultLanguage, strict });

  const languageFromUrl = getLanguageFromUrl(pathname);
  const initialLanguage: KasstorLanguageSubtag =
    isValidLanguage(languageFromUrl) && isLanguageAvailable(languageFromUrl)
      ? languageFromUrl
      : getClientLanguage();

  kasstorWebkitI18n!.languageChangeCallback = languageChangeCallback;
  kasstorWebkitI18n!.locationChangeCallback = locationChangeCallback;

  const locationToReplace = setLanguage(initialLanguage, false);

  trackLanguageChangesWithForwardAndBackwardNavigation();

  return {
    initialLanguage: fromLanguageToFullnameAndSubtag(initialLanguage),
    locationToReplace
  };
};
