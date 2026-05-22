import { getStyleSheetPromiseInfo } from "./get-style-sheet-promise-info";
import { getStyleSheetUrl } from "./get-style-sheet-url";
import { THEME_LOAD_TIMEOUT } from "./internal/constants";
import { getStylesheetFromUrl } from "./internal/get-stylesheet-from-url";
import { setStyleSheetMapping } from "./set-style-sheet-mapping";

export const fetchStyleSheet = (name: string, timeout = THEME_LOAD_TIMEOUT) => {
  const promiseInfo = getStyleSheetPromiseInfo(name, timeout);
  const bundleUrl = getStyleSheetUrl(name);

  if (bundleUrl === undefined || promiseInfo.isDownloading) {
    return;
  }
  promiseInfo.isDownloading = true;

  // Fetch the theme stylesheet
  return getStylesheetFromUrl(bundleUrl)
    .then(response => setStyleSheetMapping(name, response))
    .catch(() => promiseInfo.promiseResolver({ name, styleSheet: undefined }));
};

