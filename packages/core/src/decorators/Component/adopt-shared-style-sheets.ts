export const adoptSharedStyleSheets = async (
  renderRoot: DocumentFragment | HTMLElement,
  hasUpdated: boolean,
  serverSideRendered: boolean,
  promiseToLoadStyleSheets: Promise<void> | undefined,
  stylesheets: CSSStyleSheet[] | undefined
) => {
  // At this point, since the connectedCallback method has been called, we can assume that the component has been rendered and is attached to the DOM.
  const hasShadowDom = renderRoot instanceof ShadowRoot;

  const delayFirstRenderToWaitForStyles = !hasUpdated && !serverSideRendered && hasShadowDom;

  if (delayFirstRenderToWaitForStyles) {
    if (promiseToLoadStyleSheets !== undefined) {
      await promiseToLoadStyleSheets;
    }

    if (stylesheets !== undefined) {
      renderRoot.adoptedStyleSheets.push(...stylesheets);
    }
  }
};

