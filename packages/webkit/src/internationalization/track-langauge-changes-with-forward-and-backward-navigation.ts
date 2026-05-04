import { getClientLanguage } from "./get-client-language";
import { getCurrentLanguage } from "./get-current-language";
import { getLanguageFromUrl } from "./get-language-from-url";
import { isLanguageAvailable } from "./is-language-available";
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
    // A subtag from the URL is only honored when it's both supported by the
    // library AND part of the host's available list — otherwise we fall
    // back to the client/default chain.
    const newLanguageAfterNavigation =
      isValidLanguage(languageFromUrl) && isLanguageAvailable(languageFromUrl)
        ? languageFromUrl
        : getClientLanguage();

    if (newLanguageAfterNavigation !== getCurrentLanguage()?.subtag) {
      setLanguage(newLanguageAfterNavigation, false);
    }
  });
};

