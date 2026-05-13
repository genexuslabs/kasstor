import { getClientLanguage } from "./get-client-language";
import { getCurrentLanguage } from "./get-current-language";
import { getLanguageFromUrl } from "./get-language-from-url";
import { isLanguageAvailable } from "./is-language-available";
import { normalizeTag } from "./normalize-tag";
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
    const raw = getLanguageFromUrl(window.location.pathname);
    const canonical = raw === null ? undefined : normalizeTag(raw);

    // A tag from the URL is only honored when its base is supported AND it
    // matches the host's available list — otherwise fall back to the
    // client/default chain.
    const newLanguageAfterNavigation =
      canonical !== undefined && isLanguageAvailable(canonical)
        ? canonical
        : getClientLanguage();

    if (newLanguageAfterNavigation !== getCurrentLanguage()) {
      setLanguage(newLanguageAfterNavigation, false);
    }
  });
};
