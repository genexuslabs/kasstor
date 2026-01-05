import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { repeat } from "lit/directives/repeat.js";

import { patchLitUpdates } from "../../analysis/performance.js";
import { IS_SERVER } from "../../development-flags";

// Side-effect to define the performance scan item
import "./internals/performance-scan-item/performance-scan-item.lit";

import styles from "./performance-scan.scss?inline";

// Alias to improve the minified size
const global = globalThis;

// On the server we don't check anything, as the update lifecycle doesn't exists
if (!IS_SERVER) {
  patchLitUpdates();
}

/**
 * A component to visualize re-renders on Lit components.
 * @status experimental
 */
@Component({
  styles,
  tag: "kst-performance-scan"
})
export class KstPerformanceScan extends KasstorElement {
  /**
   * `true` to show the FPS
   */
  @property({ type: Boolean }) showFps: boolean = false;

  override connectedCallback(): void {
    super.connectedCallback();
    global.kasstorInsightsUpdateCallback = () => this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    global.kasstorInsightsUpdateCallback = undefined;
  }

  override render() {
    const updatedCustomElements = global.kasstorInsightsUpdatedCustomElements;

    if (IS_SERVER || updatedCustomElements === undefined) {
      return;
    }

    return html`${repeat(
      updatedCustomElements.values(),
      item => item.id,
      item =>
        html`<kst-performance-scan-item
          .anchorRef=${item.model.anchorRef}
          .anchorTagName=${item.model.anchorTagName}
          .renderCount=${item.renderCount}
        ></kst-performance-scan-item>`
    )}`;
  }
}

export default KstPerformanceScan;

declare global {
  interface HTMLElementTagNameMap {
    "kst-performance-scan": KstPerformanceScan;
  }
}
