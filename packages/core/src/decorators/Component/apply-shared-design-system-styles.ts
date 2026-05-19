import { getStyleSheetUrl } from "@genexus/kasstor-design-system/get-style-sheet-url.js";
import { guard } from "lit/directives/guard.js";
import { html } from "lit/html.js";

import type { KasstorElement } from "../../index.js";

// TODO: We should find a better way to do this without this workaround (.render is a protected property),
// but it's a quick fix to avoid the type errors.
type ComponentWorkaround = KasstorElement & { render: () => unknown };

/**
 * Applies the shared design system styles to the component.
 *
 * @param component - The component to apply the shared design system styles to.
 * @param sharedDesignSystemStylesheet - The shared design system stylesheet to apply to the component.
 * @param wasServerSideRendered - Whether the component was server side rendered.
 */
export const applySharedDesignSystemStyles = (
  component: KasstorElement,
  sharedDesignSystemStylesheet: string[] | undefined,
  wasServerSideRendered: boolean
) => {
  if (sharedDesignSystemStylesheet === undefined) {
    return;
  }

  const styleSheetUrls: string[] = [];

  // For let i = ... is the faster way to iterate over the array in JavaScript
  for (let i = 0; i < sharedDesignSystemStylesheet.length; i++) {
    const styleSheetUrl = getStyleSheetUrl(sharedDesignSystemStylesheet[i]);
    if (styleSheetUrl === undefined) {
      console.warn(
        `[@genexus/kasstor-core | KasstorElement] The shared design system style "${sharedDesignSystemStylesheet[i]}" is not registered when registering the "${component.tagName}" component. The component will not be able to use it.\nYou must call first the "registerDesignSystem" function of the "@genexus/kasstor-design-system" package to register the style.`
      );
    } else {
      styleSheetUrls.push(styleSheetUrl);
    }
  }

  if (styleSheetUrls.length === 0) {
    return;
  }

  const renderOriginalImplementation = (component as ComponentWorkaround).render;

  /**
   * Template cache for the shared design system styles, so we can skip diffing
   * the template when updating the component, which improves the performance.
   */
  const sharedStylesTemplateCache = wasServerSideRendered
    ? guard([], () =>
        styleSheetUrls.map(url => html`<link rel="stylesheet" crossorigin href=${url} />`)
      )
    : guard([], () => html`<ch-theme .model=${styleSheetUrls}></ch-theme>`);

  // Monkey-patch the render method to add the shared design system styles in the template
  (component as ComponentWorkaround).render = function () {
    return html`${sharedStylesTemplateCache}${renderOriginalImplementation.call(this)}`;
  };

  const waitForTheChThemeToBeDownloaded = !wasServerSideRendered;

  if (waitForTheChThemeToBeDownloaded) {
    import("../../components/theme/theme.lit.js");
  }
};

