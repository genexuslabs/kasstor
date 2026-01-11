import {
  Component,
  KasstorElement
} from "@genexus/kasstor-core/decorators/component.js";
import {
  Event,
  type EventEmitter
} from "@genexus/kasstor-core/decorators/event.js";
import { html } from "lit";
import { property } from "lit/decorators.js";

@Component({
  tag: "kst-layout"
})
export class KstLayout extends KasstorElement {
  /**
   * Property value description.
   */
  @property() value: string = "test";

  /**
   * event1 description.
   */
  @Event() event1!: EventEmitter<string>;

  /**
   * Description for method1.
   * @param param1 description for param1
   */
  method1 = (param1?: number): string => {
    return "Hello world" + param1;
  };

  override firstWillUpdate(): void {}
  override willUpdate(): void {}

  override render() {
    return html`<h1>Hello world</h1> `;
  }
}
