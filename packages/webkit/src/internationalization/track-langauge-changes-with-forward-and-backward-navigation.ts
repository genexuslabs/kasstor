import { getClientLanguage } from "./get-client-language";
import { getCurrentLanguage } from "./get-current-language";
import { getLanguageFromUrl } from "./get-language-from-url";
import { isValidLanguage } from "./is-valid-language";
import { setLanguage } from "./set-language";

let trackingNavigation = false;

export const trackLanguageChangesWithForwardAndBackwardNavigation = () => {
  // TODO: Use different outputs for the browser and server, so we don't need
  // to add this check.
  if (typeof window === "undefined" || trackingNavigation) {
    return;
  }
  trackingNavigation = true;

  // Listen to the "popstate" event to detect forward/backward navigation
  window.addEventListener("popstate", () => {
    const languageFromUrl = getLanguageFromUrl(window.location.pathname);
    const newLanguageAfterNavigation = isValidLanguage(languageFromUrl)
      ? languageFromUrl
      : getClientLanguage();

    if (newLanguageAfterNavigation !== getCurrentLanguage()?.subtag) {
      setLanguage(newLanguageAfterNavigation, false);
    }
  });
};

