import type { LitElement } from "lit";
import { IS_SERVER } from "../../development-flags.js";

/**
 * Implements a basic check to decide if the component was server side rendered.
 *
 * This function must be used before the first render!
 */
export const componentWasServerSideRendered = (element: LitElement) =>
  IS_SERVER ||
  (!!element.shadowRoot && element.shadowRoot.children.length !== 0);
