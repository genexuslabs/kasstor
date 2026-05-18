const fetchStylesheetFromUrl = (url: string) =>
  fetch(url)
    .then(response => response.text())
    .then(text => {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(text);
      return styleSheet;
    });

/**
 * Creates a constructed style sheet from a DOM style sheet.
 *
 * This copy is necessary because the DOM style sheet is not a constructed
 * style sheet, so we can not adopt it into the DOM.
 */
const createConstructedStyleSheetFromDomStyleSheet = (domStyleSheet: CSSStyleSheet) => {
  const result = new CSSStyleSheet();
  let css = "";

  for (const r of domStyleSheet.cssRules) {
    css += r.cssText;
  }

  result.replaceSync(css);

  return result;
};

export const getStylesheetFromUrl = (url: string) => {
  const linkRef = document.head.querySelector(`link[href='${url}']`) as HTMLLinkElement;

  // If the link is not found in the head, fetch the stylesheet from the URL
  if (!linkRef) {
    return fetchStylesheetFromUrl(url);
  }

  // If the stylesheet is already loaded, return the link
  if (linkRef.sheet) {
    return Promise.resolve(createConstructedStyleSheetFromDomStyleSheet(linkRef.sheet));
  }
  const ctrl = new AbortController(); // Used to avoid memory leaks of event listeners
  const { signal } = ctrl;

  return new Promise<CSSStyleSheet>((resolve, reject) => {
    linkRef.addEventListener(
      "load",
      () => {
        ctrl.abort();
        resolve(createConstructedStyleSheetFromDomStyleSheet(linkRef.sheet!));
      },
      { signal }
    );
    linkRef.addEventListener(
      "error",
      e => {
        ctrl.abort();
        reject(e);
      },
      { signal }
    );
  });
};

