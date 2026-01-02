import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { repeat } from "lit/directives/repeat.js";

import {
  patchLitRenders,
  PERFORMANCE_SCAN_RE_RENDER_EVENT_NAME
} from "../../analysis/performance";
import { IS_SERVER } from "../../development-flags";
import type { PerformanceScanRenderedItems } from "./types";

// Side-effect to define the performance scan item
import "./internals/performance-scan-item/performance-scan-item.lit";

import styles from "./performance-scan.scss?inline";

// On the server we don't check anything
const renderedItems: PerformanceScanRenderedItems = IS_SERVER
  ? new Map()
  : patchLitRenders();

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

  #updateRenderedItems = () => this.requestUpdate();

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener(
      PERFORMANCE_SCAN_RE_RENDER_EVENT_NAME,
      this.#updateRenderedItems
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener(
      PERFORMANCE_SCAN_RE_RENDER_EVENT_NAME,
      this.#updateRenderedItems
    );
  }

  override render() {
    return html`${repeat(
      renderedItems.values(),
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

