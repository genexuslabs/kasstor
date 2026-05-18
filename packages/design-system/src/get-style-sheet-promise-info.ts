import { THEME_LOAD_TIMEOUT } from "./internal/constants";
import { THEME_NAME_TO_PROMISE_MAPPING } from "./internal/store";
import type { ThemePromiseResolver } from "./typings/internal-types";

const clearPromiseInfoAfterCompletion = (themeName: string) =>
  THEME_NAME_TO_PROMISE_MAPPING.delete(themeName);

export const getThemePromiseInfoFromCache = (name: string): ThemePromiseResolver | undefined =>
  THEME_NAME_TO_PROMISE_MAPPING.get(name);

export const getStyleSheetPromiseInfo = (
  name: string,
  timeout = THEME_LOAD_TIMEOUT
): ThemePromiseResolver => {
  const cachedPromiseInfo = getThemePromiseInfoFromCache(name);
  if (cachedPromiseInfo) {
    return cachedPromiseInfo;
  }

  const promiseInfo: Partial<ThemePromiseResolver> = {
    isDownloading: false
  };
  promiseInfo.promise = new Promise<{ name: string; styleSheet: CSSStyleSheet | undefined }>(
    resolve => {
      // Timeout the promise (rejecting it) if it takes too long to load
      const timeoutId = setTimeout(() => {
        console.error(`[kst-theme] Timed out while trying to load theme "${name}"`);
        resolve({ name, styleSheet: undefined });
      }, timeout);

      // Resolve the promise with the loaded stylesheet and clear the timeout
      promiseInfo.promiseResolver = (value: {
        name: string;
        styleSheet: CSSStyleSheet | undefined;
      }) => {
        clearTimeout(timeoutId);
        resolve(value);

        // TODO: Add a test to validate this case, where the promise is resolved and the promise info is cleared,
        // but there are other promises waiting for the same theme name.
        clearPromiseInfoAfterCompletion(name);
      };
    }
  );
  THEME_NAME_TO_PROMISE_MAPPING.set(name, promiseInfo as ThemePromiseResolver);

  return promiseInfo as ThemePromiseResolver;
};

