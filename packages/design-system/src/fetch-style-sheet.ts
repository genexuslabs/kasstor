import { getStyleSheetPromiseInfo } from "./get-style-sheet-promise-info";
import { THEME_LOAD_TIMEOUT } from "./internal/constants";
import { getDesignSystemLoaders } from "./internal/get-design-system-registry";
import { getStylesheetFromUrl } from "./internal/get-stylesheet-when-from-url";
import { setStyleSheetMapping } from "./set-style-sheet-mapping";

export const fetchStyleSheet = (name: string, timeout = THEME_LOAD_TIMEOUT) => {
  const promiseInfo = getStyleSheetPromiseInfo(name, timeout);
  const bundleUrl = getDesignSystemLoaders().get(name);

  if (bundleUrl === undefined || promiseInfo.isDownloading) {
    return;
  }
  promiseInfo.isDownloading = true;

  // Fetch the theme stylesheet
  return getStylesheetFromUrl(bundleUrl)
    .then(response => setStyleSheetMapping(name, response))
    .catch(() => promiseInfo.promiseResolver({ name, styleSheet: undefined }));
};

