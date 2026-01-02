import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators/property.js";

import styles from "./performance-scan-item.scss?inline";

/**
 * @status experimental
 */
@Component({
  styles,
  tag: "kst-performance-scan-item"
})
export class KstPerformanceScanItem extends KasstorElement {
  /**
   * Specifies a reference for the scanned element.
   */
  @property({ attribute: false }) anchorRef!: LitElement;

  /**
   * Specifies the tagName of the scanned element.
   */
  @property({ attribute: false }) anchorTagName!: string;

  /**
   * Specifies how many times the scanned element has rendered in a buffer of
   * time.
   */
  @property({ attribute: false }) renderCount!: number;

  protected override willUpdate() {
    if (this.hasUpdated) {
      const animation = this.getAnimations()[0];

      animation?.cancel();
      animation?.play();
    }
  }

  override render() {
    const { left, top, width, height } = this.anchorRef.getBoundingClientRect();

    this.style.setProperty("--ch-performance-scan-item-top", `${top}px`);
    this.style.setProperty("--ch-performance-scan-item-left", `${left}px`);
    this.style.setProperty(
      "--ch-performance-scan-item-block-size",
      `${height}px`
    );
    this.style.setProperty(
      "--ch-performance-scan-item-inline-size",
      `${width}px`
    );

    return html`<span class=${top > 15 ? "outside" : nothing}
      >${this.anchorTagName} x ${this.renderCount}</span
    >`;
  }
}

export default KstPerformanceScanItem;

declare global {
  interface HTMLElementTagNameMap {
    "kst-performance-scan-item": KstPerformanceScanItem;
  }
}

