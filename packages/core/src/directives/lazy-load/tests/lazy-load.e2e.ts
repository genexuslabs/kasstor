import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { html as staticHTML, unsafeStatic } from "lit/static-html.js";
import { afterEach, describe, expect, test } from "vitest";
import { render } from "vitest-browser-lit";
import {
  Component,
  SSRLitElement
} from "../../../decorators/Component/index.js";
import { lazyLoad } from "../index.js";

const LAZY_LOAD_MESSAGE_ERROR =
  "[@genexus/kasstor-core]: `lazyLoad()` can only be used in a ElementPart. For example:\n<my-element ${lazyLoad()}></my-element>";

/**
 * @fires event1
 */
@Component({ tag: "lazy-load-directive-component-test" })
class LazyLoadDirectiveComponentTest extends SSRLitElement {
  @property() templateTagName = "custom-element-1";

  @property({ type: Boolean }) condition: boolean = false;

  override render() {
    return this.condition
      ? html`<fixed-custom-element ${lazyLoad()}></fixed-custom-element>`
      : staticHTML`<${unsafeStatic(this.templateTagName)} ${lazyLoad()}></${unsafeStatic(this.templateTagName)}>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lazy-load-directive-component-test": LazyLoadDirectiveComponentTest;
  }
}

describe("[Directives]", () => {
  describe("[lazyLoad]", () => {
    afterEach(() => {
      // Cleanup the DOM. Since we are not using the render from
      // vitest-browser-lit, we must do it "manually"
      document.body.innerHTML = "";
    });

    test("should not throw error when used in an ElementPart", () =>
      render(html`<my-custom-element ${lazyLoad()}></my-custom-element>`));

    test("should throw error when used in an AttributePart", () =>
      expect(() =>
        render(
          html`<my-custom-element hello=${lazyLoad()}></my-custom-element>`
        )
      ).toThrowError(new Error(LAZY_LOAD_MESSAGE_ERROR)));

    test("should throw error when used in an ChildPart", () =>
      expect(() =>
        render(html`<my-custom-element>${lazyLoad()}</my-custom-element>`)
      ).toThrowError(new Error(LAZY_LOAD_MESSAGE_ERROR)));

    test("should throw error when used in an PropertyPart", () =>
      expect(() =>
        render(
          html`<my-custom-element .hello=${lazyLoad()}></my-custom-element>`
        )
      ).toThrowError(new Error(LAZY_LOAD_MESSAGE_ERROR)));

    test("should throw error when used in an BooleanPart", () =>
      expect(() =>
        render(
          html`<my-custom-element ?hello=${lazyLoad()}></my-custom-element>`
        )
      ).toThrowError(new Error(LAZY_LOAD_MESSAGE_ERROR)));

    test("should throw error when used in an EventPart", () =>
      expect(() =>
        render(
          html`<my-custom-element @event1=${lazyLoad()}></my-custom-element>`
        )
      ).toThrowError(new Error(LAZY_LOAD_MESSAGE_ERROR)));
  });
});
