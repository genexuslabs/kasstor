import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../Component/index.js";
import { Observe } from "../index.js";

const propUndefinedCallbackMock = vi.fn();
const propStringCallbackMock = vi.fn();
const propNumberCallbackMock = vi.fn();
const propBooleanCallbackMock = vi.fn();
const propNullCallbackMock = vi.fn();
const propObjectCallbackMock = vi.fn();
const propArrayCallbackMock = vi.fn();
const propFunctionCallbackMock = vi.fn();
const propSymbolCallbackMock = vi.fn();

const TEST_SYMBOL = Symbol("observe-test-1");
const TEST_DUMMY_FUNCTION = () => {};

@Component({ tag: "observe-test-1" })
class ObserveCallbackTest1 extends KasstorElement {
  @property({ attribute: false }) propUndefined: unknown | undefined;
  @Observe("propUndefined")
  protected propUndefinedChanged(
    newValue: unknown | undefined,
    oldValue: unknown | undefined
  ) {
    propUndefinedCallbackMock(newValue, oldValue);
  }

  @property() propString: string | undefined = "Default value for propString";
  @Observe("propString")
  protected propStringChanged(
    newValue: string | undefined,
    oldValue: string | undefined
  ) {
    propStringCallbackMock(newValue, oldValue);
  }

  @property({ type: Number }) propNumber: number | undefined = 5;
  @Observe("propNumber")
  protected propNumberChanged(
    newValue: number | undefined,
    oldValue: number | undefined
  ) {
    propNumberCallbackMock(newValue, oldValue);
  }

  @property({ type: Boolean }) propBoolean: boolean | undefined = false;
  @Observe("propBoolean")
  protected propBooleanChanged(
    newValue: boolean | undefined,
    oldValue: boolean | undefined
  ) {
    propBooleanCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propNull: null | undefined = null;
  @Observe("propNull")
  protected propNullChanged(
    newValue: null | undefined,
    oldValue: null | undefined
  ) {
    propNullCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propObject:
    | Record<string, string>
    | undefined = {};
  @Observe("propObject")
  protected propObjectChanged(
    newValue: Record<string, string> | undefined,
    oldValue: Record<string, string> | undefined
  ) {
    propObjectCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propArray: unknown[] | undefined = [];
  @Observe("propArray")
  protected propArrayChanged(
    newValue: unknown[] | undefined,
    oldValue: unknown[] | undefined
  ) {
    propArrayCallbackMock(newValue, oldValue);
  }

  @property() propFunction: (() => void) | undefined = TEST_DUMMY_FUNCTION;
  @Observe("propFunction")
  protected propFunctionChanged(
    newValue: (() => void) | undefined,
    oldValue: (() => void) | undefined
  ) {
    propFunctionCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propSymbol: symbol | undefined = TEST_SYMBOL;
  @Observe("propSymbol")
  protected propSymbolChanged(
    newValue: symbol | undefined,
    oldValue: symbol | undefined
  ) {
    propSymbolCallbackMock(newValue, oldValue);
  }

  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "observe-test-1": ObserveCallbackTest1;
  }
}

const renderElement1 = async () => {
  render(html`<observe-test-1></observe-test-1>`);
  const watchTest1Ref = document.querySelector("observe-test-1")!;
  await watchTest1Ref.updateComplete;

  return watchTest1Ref;
};

const renderElement1WithProperty = async (properties: {
  propUndefined: unknown | undefined;
  propString: string | undefined;
  propNumber: number | undefined;
  propBoolean: boolean | undefined;
  propNull: null | undefined;
  propObject: Record<string, string> | undefined;
  propArray: unknown[] | undefined;
  propFunction: (() => void) | undefined;
  propSymbol: symbol | undefined;
}) => {
  const {
    propUndefined,
    propString,
    propNumber,
    propBoolean,
    propNull,
    propObject,
    propArray,
    propFunction,
    propSymbol
  } = properties;

  render(
    html`<observe-test-1
      .propUndefined=${propUndefined}
      .propString=${propString}
      .propNumber=${propNumber}
      .propBoolean=${propBoolean}
      .propNull=${propNull}
      .propObject=${propObject}
      .propArray=${propArray}
      .propFunction=${propFunction}
      .propSymbol=${propSymbol}
    ></observe-test-1>`
  );
  const observeTest1Ref = document.querySelector("observe-test-1")!;
  await observeTest1Ref.updateComplete;

  return observeTest1Ref;
};

describe("[Decorator]", () => {
  describe("[Observe]", () => {
    beforeEach(() => {
      propUndefinedCallbackMock.mockReset();
      propStringCallbackMock.mockReset();
      propNumberCallbackMock.mockReset();
      propBooleanCallbackMock.mockReset();
      propNullCallbackMock.mockReset();
      propObjectCallbackMock.mockReset();
      propArrayCallbackMock.mockReset();
      propFunctionCallbackMock.mockReset();
      propSymbolCallbackMock.mockReset();
    });

    afterEach(() => cleanup());

    test("should not fire the Observe callback when the property has undefined as the default value on the initial load", async () => {
      await renderElement1();

      expect(propUndefinedCallbackMock).toHaveBeenCalledTimes(0);
    });

    test("should not fire the Observe callback when the property has undefined as the initial value on the initial load", async () => {
      await renderElement1WithProperty({
        propUndefined: undefined,
        propString: undefined,
        propNumber: undefined,
        propBoolean: undefined,
        propNull: undefined,
        propObject: undefined,
        propArray: undefined,
        propFunction: undefined,
        propSymbol: undefined
      });

      expect(propUndefinedCallbackMock).toHaveBeenCalledTimes(0);
      expect(propStringCallbackMock).toHaveBeenCalledTimes(0);
      expect(propNumberCallbackMock).toHaveBeenCalledTimes(0);
      expect(propBooleanCallbackMock).toHaveBeenCalledTimes(0);
      expect(propNullCallbackMock).toHaveBeenCalledTimes(0);
      expect(propObjectCallbackMock).toHaveBeenCalledTimes(0);
      expect(propArrayCallbackMock).toHaveBeenCalledTimes(0);
      expect(propFunctionCallbackMock).toHaveBeenCalledTimes(0);
      expect(propSymbolCallbackMock).toHaveBeenCalledTimes(0);
    });

    test("should fire the Observe callback on the initial load when the property has a string as the default value", async () => {
      await renderElement1();

      expect(propStringCallbackMock).toHaveBeenCalledTimes(1);
      expect(propStringCallbackMock).toHaveBeenCalledWith(
        "Default value for propString",
        undefined
      );
    });

    test("should fire the Observe callback on the initial load when the property has a number as the default value", async () => {
      await renderElement1();

      expect(propNumberCallbackMock).toHaveBeenCalledTimes(1);
      expect(propNumberCallbackMock).toHaveBeenCalledWith(5, undefined);
    });

    test("should fire the Observe callback on the initial load when the property has a boolean as the default value", async () => {
      await renderElement1();

      expect(propBooleanCallbackMock).toHaveBeenCalledTimes(1);
      expect(propBooleanCallbackMock).toHaveBeenCalledWith(false, undefined);
    });

    test("should fire the Observe callback on the initial load when the property has null as the default value", async () => {
      await renderElement1();

      expect(propNullCallbackMock).toHaveBeenCalledTimes(1);
      expect(propNullCallbackMock).toHaveBeenCalledWith(null, undefined);
    });

    test("should fire the Observe callback on the initial load when the property has an object as the default value", async () => {
      await renderElement1();

      expect(propObjectCallbackMock).toHaveBeenCalledTimes(1);
      expect(propObjectCallbackMock).toHaveBeenCalledWith({}, undefined);
    });

    test("should fire the Observe callback on the initial load when the property has an array as the default value", async () => {
      await renderElement1();

      expect(propArrayCallbackMock).toHaveBeenCalledTimes(1);
      expect(propArrayCallbackMock).toHaveBeenCalledWith([], undefined);
    });

    test("should fire the Observe callback on the initial load when the property has an function as the default value", async () => {
      await renderElement1();

      expect(propFunctionCallbackMock).toHaveBeenCalledTimes(1);
      expect(propFunctionCallbackMock).toHaveBeenCalledWith(
        TEST_DUMMY_FUNCTION,
        undefined
      );
    });

    test("should fire the Observe callback on the initial load when the property has an symbol as the default value", async () => {
      await renderElement1();

      expect(propSymbolCallbackMock).toHaveBeenCalledTimes(1);
      expect(propSymbolCallbackMock).toHaveBeenCalledWith(
        TEST_SYMBOL,
        undefined
      );
    });

    test("even if the initial value matches the default property value, the Observe callback should be fired unless the value is undefined", async () => {
      await renderElement1WithProperty({
        propUndefined: undefined,
        propString: "Default value for propString",
        propNumber: 5,
        propBoolean: false,
        propNull: null,
        propObject: {},
        propArray: [],
        propFunction: TEST_DUMMY_FUNCTION,
        propSymbol: TEST_SYMBOL
      });

      expect(propUndefinedCallbackMock).toHaveBeenCalledTimes(0);
      expect(propStringCallbackMock).toHaveBeenCalledTimes(1);
      expect(propNumberCallbackMock).toHaveBeenCalledTimes(1);
      expect(propBooleanCallbackMock).toHaveBeenCalledTimes(1);
      expect(propNullCallbackMock).toHaveBeenCalledTimes(1);
      expect(propObjectCallbackMock).toHaveBeenCalledTimes(1);
      expect(propArrayCallbackMock).toHaveBeenCalledTimes(1);
      expect(propFunctionCallbackMock).toHaveBeenCalledTimes(1);
      expect(propSymbolCallbackMock).toHaveBeenCalledTimes(1);

      expect(propStringCallbackMock).toHaveBeenCalledWith(
        "Default value for propString",
        undefined
      );
      expect(propNumberCallbackMock).toHaveBeenCalledWith(5, undefined);
      expect(propBooleanCallbackMock).toHaveBeenCalledWith(false, undefined);
      expect(propNullCallbackMock).toHaveBeenCalledWith(null, undefined);
      expect(propObjectCallbackMock).toHaveBeenCalledWith({}, undefined);
      expect(propArrayCallbackMock).toHaveBeenCalledWith([], undefined);
      expect(propFunctionCallbackMock).toHaveBeenCalledWith(
        TEST_DUMMY_FUNCTION,
        undefined
      );
      expect(propSymbolCallbackMock).toHaveBeenCalledWith(
        TEST_SYMBOL,
        undefined
      );
    });

    test("the Observe callback should be fired on the initial load when the initial value differs the default value", async () => {
      // await renderElement1WithProperty({
      //   propUndefined: undefined,
      //   propString: "Default value for propString",
      //   propNumber: 5,
      //   propBoolean: false,
      //   propNull: null,
      //   propObject: {},
      //   propArray: [],
      //   propFunction: TEST_DUMMY_FUNCTION,
      //   propSymbol: TEST_SYMBOL
      // });
      // expect(propUndefinedCallbackMock).toHaveBeenCalledTimes(0);
      // expect(propStringCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propNumberCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propBooleanCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propNullCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propObjectCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propArrayCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propFunctionCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propSymbolCallbackMock).toHaveBeenCalledTimes(1);
      // expect(propStringCallbackMock).toHaveBeenCalledWith(
      //   "Default value for propString",
      //   undefined
      // );
      // expect(propNumberCallbackMock).toHaveBeenCalledWith(5, undefined);
      // expect(propBooleanCallbackMock).toHaveBeenCalledWith(false, undefined);
      // expect(propNullCallbackMock).toHaveBeenCalledWith(null, undefined);
      // expect(propObjectCallbackMock).toHaveBeenCalledWith({}, undefined);
      // expect(propArrayCallbackMock).toHaveBeenCalledWith([], undefined);
      // expect(propFunctionCallbackMock).toHaveBeenCalledWith(
      //   TEST_DUMMY_FUNCTION,
      //   undefined
      // );
      // expect(propSymbolCallbackMock).toHaveBeenCalledWith(
      //   TEST_SYMBOL,
      //   undefined
      // );
    });

    test.todo(
      "the newValue and oldValue should work properly on the initial load",
      async () => {
        // await renderElement1WithProperty("Hello");
        // expect(prop1CallbackMock).toHaveBeenCalledTimes(1);
        // expect(prop1CallbackMock).toHaveBeenCalledWith("Hello", undefined);
      }
    );

    test.todo(
      "the newValue and oldValue should work properly in runtime",
      async () => {
        // const elementRef = await renderElement1();
        // elementRef.prop1 = "Hello runtime";
        // // Should wait for this microtask to end to process the change
        // expect(prop1CallbackMock).toHaveBeenCalledTimes(1);
        // await elementRef.updateComplete;
        // expect(prop1CallbackMock).toHaveBeenCalledTimes(1);
        // expect(prop1CallbackMock).toHaveBeenCalledWith(
        //   "Hello runtime",
        //   undefined
        // );
        // elementRef.prop1 = "Hello runtime 2";
        // // Should wait for this microtask to end to process the change
        // expect(prop1CallbackMock).toHaveBeenCalledTimes(1);
        // await elementRef.updateComplete;
        // expect(prop1CallbackMock).toHaveBeenCalledTimes(2);
        // expect(prop1CallbackMock).toHaveBeenCalledWith(
        //   "Hello runtime 2",
        //   "Hello runtime"
        // );
      }
    );

    test.todo(
      "the newValue and oldValue should work properly on the initial load and in runtime",
      async () => {
        // const elementRef = await renderElement1WithProperty("Hello");
        // elementRef.prop1 = "Hello runtime";
        // // Should wait for this microtask to end to process the change
        // expect(prop1CallbackMock).toHaveBeenCalledTimes(1);
        // await elementRef.updateComplete;
        // expect(prop1CallbackMock).toHaveBeenCalledTimes(2);
        // expect(prop1CallbackMock).toHaveBeenCalledWith("Hello runtime", "Hello");
      }
    );

    test.todo(
      "changing a property or state inside the Observe callback should not trigger an extra update",
      () => {}
    );

    test.todo("should work with SSR", () => {});
  });
});
