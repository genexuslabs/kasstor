import { html, nothing } from "lit";
import { property } from "lit/decorators/property.js";
import { html as staticHTML, unsafeStatic } from "lit/static-html.js";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from "vitest";
import { registerCustomElementLoaders } from "../../../bootstrapping/register-custom-element-loaders/index.js";
import {
  Component,
  SSRLitElement
} from "../../../decorators/Component/index.js";
import { lazyLoad } from "../index.js";

/**
 * @fires event1
 */
@Component({ tag: "lazy-load-directive-component-test-1" })
class LazyLoadDirectiveComponentTest extends SSRLitElement {
  @property() templateTagName = "test-custom-element-1";

  @property({ type: Boolean }) condition: boolean = false;

  override render() {
    return this.condition
      ? staticHTML`<${unsafeStatic(this.templateTagName)} ${lazyLoad()}></${unsafeStatic(this.templateTagName)}>`
      : html`<test-lazy-load-component
          ${lazyLoad()}
        ></test-lazy-load-component>`;
  }
}

@Component({ tag: "lazy-load-directive-component-test-2" })
class LazyLoadDirectiveComponentTest2 extends SSRLitElement {
  @property({ type: Boolean }) condition: boolean = false;

  override render() {
    if (this.condition) {
      return html`<test-lazy-load-component-2
        ${lazyLoad()}
      ></test-lazy-load-component-2>`;
    }

    return nothing;
  }
}

@Component({ tag: "lazy-load-directive-component-test-3" })
class LazyLoadDirectiveComponentTest3 extends SSRLitElement {
  override render() {
    return html`<test-lazy-load-component-3
      ${lazyLoad()}
    ></test-lazy-load-component-3>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lazy-load-directive-component-test-1": LazyLoadDirectiveComponentTest;
    "lazy-load-directive-component-test-2": LazyLoadDirectiveComponentTest2;
    "lazy-load-directive-component-test-3": LazyLoadDirectiveComponentTest3;
  }
}

describe("[Directives]", () => {
  describe("[lazyLoad]", () => {
    const testLazyMock = vi.fn();

    beforeAll(() => {
      registerCustomElementLoaders({
        libraryName: "Test Library",
        libraryPrefix: "test-",
        defaultCustomElementWatchingBehavior: "never-observe",

        customElements: Object.fromEntries(
          Array.from({ length: 10 }, (_, index) => [
            `test-lazy-load-component-${index + 1}`,
            { loader: () => Promise.resolve(testLazyMock()) }
          ])
        )
      });
    });

    beforeEach(() => {
      testLazyMock.mockReset();
    });

    afterEach(() => {
      // Cleanup the DOM. Since we are not using the render from
      // vitest-browser-lit, we must do it "manually"
      document.body.innerHTML = "";
    });

    test("should call the custom element loader when the element is not registered", async () => {
      const element = document.createElement(
        "lazy-load-directive-component-test-1"
      );
      document.body.appendChild(element);

      // The element didn't render yet, so the loader should not be called
      expect(testLazyMock).toHaveBeenCalledTimes(0);

      await element.updateComplete;

      // Now the element rendered, so the loader should be called
      expect(testLazyMock).toHaveBeenCalledTimes(1);
    });

    test("should call the custom element loader when the element is conditionally rendered and it is not registered yet", async () => {
      const element = document.createElement(
        "lazy-load-directive-component-test-2"
      );
      document.body.appendChild(element);

      // The condition is false by default, so the element with the lazyLoad directive is not rendered yet
      expect(testLazyMock).toHaveBeenCalledTimes(0);

      element.condition = true;
      expect(testLazyMock).toHaveBeenCalledTimes(0);
      await element.updateComplete;

      expect(testLazyMock).toHaveBeenCalledTimes(1);
    });

    test("should not call again the loader if the element is already registered", async () => {
      const el1 = document.createElement(
        "lazy-load-directive-component-test-3"
      );
      document.body.appendChild(el1);
      await el1.updateComplete;

      expect(testLazyMock).toHaveBeenCalledTimes(1);

      const el2 = document.createElement(
        "lazy-load-directive-component-test-3"
      );
      document.body.appendChild(el2);
      await el2.updateComplete;

      // The loader should not be called again
      expect(testLazyMock).toHaveBeenCalledTimes(1);
    });

    test.todo("should work without a component", () => {});

    test.todo(
      "if the element is not registered when the lazyLoad directive is called, should await its registration",
      () => {}
    );

    test.todo(
      "if the element is not registered when the lazyLoad directive is called, should await its registration, but should remove the listener if the element is removed from the DOM before being registered",
      () => {}
    );

    test.todo(
      "when the template is reconnected and the element was registered while the template was disconnected, it should not try to load it again",
      () => {}
    );

    test.todo(
      "when the template is reconnected with another tag, it should try to load the new element",
      () => {}
    );
  });
});
