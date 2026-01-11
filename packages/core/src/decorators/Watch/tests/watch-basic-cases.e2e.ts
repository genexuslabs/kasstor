import { html } from "lit";
import { property } from "lit/decorators/property.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../../Component/index.js";
import { Watch } from "../index.js";

const propUndefinedCallbackMock = vi.fn();
const propStringCallbackMock = vi.fn();
const propNumberCallbackMock = vi.fn();
const propBooleanCallbackMock = vi.fn();
const propNullCallbackMock = vi.fn();
const propObjectCallbackMock = vi.fn();
const propArrayCallbackMock = vi.fn();
const propFunctionCallbackMock = vi.fn();
const propSymbolCallbackMock = vi.fn();

const TEST_SYMBOL = Symbol("watch-test-1");
const TEST_DUMMY_FUNCTION = () => {};

@Component({ tag: "watch-test-1" })
class WatchCallbackTest1 extends KasstorElement {
  @property() propUndefined: string | undefined;
  @Watch("propUndefined")
  protected propUndefinedChanged(
    newValue: string | undefined,
    oldValue: string | undefined
  ) {
    propUndefinedCallbackMock(newValue, oldValue);
  }

  @property() propString: string = "Default value for propString";
  @Watch("propString")
  protected propStringChanged(newValue: string, oldValue: string) {
    propStringCallbackMock(newValue, oldValue);
  }

  @property({ type: Number }) propNumber: number = 5;
  @Watch("propNumber")
  protected propNumberChanged(newValue: number, oldValue: number) {
    propNumberCallbackMock(newValue, oldValue);
  }

  @property({ type: Boolean }) propBoolean: boolean = false;
  @Watch("propBoolean")
  protected propBooleanChanged(newValue: boolean, oldValue: boolean) {
    propBooleanCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propNull: null = null;
  @Watch("propNull")
  protected propNullChanged(newValue: null, oldValue: null) {
    propNullCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propObject: Record<string, string> = {};
  @Watch("propObject")
  protected propObjectChanged(
    newValue: Record<string, string>,
    oldValue: Record<string, string>
  ) {
    propObjectCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propArray: unknown[] = [];
  @Watch("propArray")
  protected propArrayChanged(newValue: unknown[], oldValue: unknown[]) {
    propArrayCallbackMock(newValue, oldValue);
  }

  @property() propFunction: () => void = TEST_DUMMY_FUNCTION;
  @Watch("propFunction")
  protected propFunctionChanged(newValue: () => void, oldValue: () => void) {
    propFunctionCallbackMock(newValue, oldValue);
  }

  @property({ attribute: false }) propSymbol: symbol = TEST_SYMBOL;
  @Watch("propSymbol")
  protected propSymbolChanged(newValue: symbol, oldValue: symbol) {
    propSymbolCallbackMock(newValue, oldValue);
  }

  override render() {
    return html`<p>Hello World</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "watch-test-1": WatchCallbackTest1;
  }
}

const renderElement1 = async () => {
  render(html`<watch-test-1></watch-test-1>`);
  const watchTest1Ref = document.querySelector("watch-test-1")!;
  await watchTest1Ref.updateComplete;

  return watchTest1Ref;
};

const renderElement1WithProperty = async (properties: {
  propUndefined: string | undefined;
  propString: string;
  propNumber: number;
  propBoolean: boolean;
  propNull: null;
  propObject: Record<string, string>;
  propArray: unknown[];
  propFunction: () => void;
  propSymbol: symbol;
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
    html`<watch-test-1
      .propUndefined=${propUndefined}
      .propString=${propString}
      .propNumber=${propNumber}
      .propBoolean=${propBoolean}
      .propNull=${propNull}
      .propObject=${propObject}
      .propArray=${propArray}
      .propFunction=${propFunction}
      .propSymbol=${propSymbol}
    ></watch-test-1>`
  );
  const watchTest1Ref = document.querySelector("watch-test-1")!;
  await watchTest1Ref.updateComplete;

  return watchTest1Ref;
};

describe("[Decorator]", () => {
  describe("[Watch]", () => {
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

    test("should not fire the Watch callback when the property has undefined as the default value on the initial load", async () => {
      await renderElement1();

      expect(propUndefinedCallbackMock).toHaveBeenCalledTimes(0);
    });

    test("should fire the Watch callback on the initial load when the property has a string as the default value", async () => {
      await renderElement1();

      expect(propStringCallbackMock).toHaveBeenCalledTimes(1);
      expect(propStringCallbackMock).toHaveBeenCalledWith(
        "Default value for propString",
        undefined
      );
    });

    test("should fire the Watch callback on the initial load when the property has a number as the default value", async () => {
      await renderElement1();

      expect(propNumberCallbackMock).toHaveBeenCalledTimes(1);
      expect(propNumberCallbackMock).toHaveBeenCalledWith(5, undefined);
    });

    test("should fire the Watch callback on the initial load when the property has a boolean as the default value", async () => {
      await renderElement1();

      expect(propBooleanCallbackMock).toHaveBeenCalledTimes(1);
      expect(propBooleanCallbackMock).toHaveBeenCalledWith(false, undefined);
    });

    test("should fire the Watch callback on the initial load when the property has null as the default value", async () => {
      await renderElement1();

      expect(propNullCallbackMock).toHaveBeenCalledTimes(1);
      expect(propNullCallbackMock).toHaveBeenCalledWith(null, undefined);
    });

    test("should fire the Watch callback on the initial load when the property has an object as the default value", async () => {
      await renderElement1();

      expect(propObjectCallbackMock).toHaveBeenCalledTimes(1);
      expect(propObjectCallbackMock).toHaveBeenCalledWith({}, undefined);
    });

    test("should fire the Watch callback on the initial load when the property has an array as the default value", async () => {
      await renderElement1();

      expect(propArrayCallbackMock).toHaveBeenCalledTimes(1);
      expect(propArrayCallbackMock).toHaveBeenCalledWith([], undefined);
    });

    test("should fire the Watch callback on the initial load when the property has an function as the default value", async () => {
      await renderElement1();

      expect(propFunctionCallbackMock).toHaveBeenCalledTimes(1);
      expect(propFunctionCallbackMock).toHaveBeenCalledWith(
        TEST_DUMMY_FUNCTION,
        undefined
      );
    });

    test("should fire the Watch callback on the initial load when the property has an symbol as the default value", async () => {
      await renderElement1();

      expect(propSymbolCallbackMock).toHaveBeenCalledTimes(1);
      expect(propSymbolCallbackMock).toHaveBeenCalledWith(
        TEST_SYMBOL,
        undefined
      );
    });

    test("even if the initial value matches the default property value, the Watch callback should be fired unless the value is undefined", async () => {
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

    test("the Watch callback should be fired on the initial load when the initial value differs the default value", async () => {
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
  });
});
