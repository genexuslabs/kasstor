import { html, LitElement } from "lit";
import { property } from "lit/decorators/property.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";

import { Event, type EventEmitter } from "../index.js";

/**
 * @fires event1
 */
class DummyComponent extends LitElement {
  @property() name: string | undefined;

  @Event() event1!: EventEmitter<unknown>;

  @Event() event2!: EventEmitter<unknown>;

  fireEvent1WithDetail(detail: unknown, options?: EventInit) {
    this.event1.emit(detail, options);
  }

  fireEvent1WithPrevent(
    callbackIfNotCancelled: () => unknown,
    options?: EventInit
  ) {
    const eventInfo = this.event1.emit(undefined, options);

    if (!eventInfo.defaultPrevented) {
      callbackIfNotCancelled();
    }
  }
}

customElements.define("geai-event-dummy-component", DummyComponent);

describe(`[Decorator]`, () => {
  describe(`[Event]`, () => {
    let dummyComponentRef: DummyComponent;

    let event1Handler = (event: CustomEvent) => {
      event1DetailChecker(event.detail);
    };
    let event1CancellableHandler = (event: CustomEvent) => {
      event1DetailChecker(event.detail);
    };
    let event1DetailChecker = vi.fn();
    let callbackIfNotCancelled = vi.fn();

    beforeEach(async () => {
      // Redefine the mocks before running each test
      event1Handler = (event: CustomEvent) => {
        event1DetailChecker(event.detail);
      };
      event1CancellableHandler = (event: CustomEvent) => {
        event.preventDefault();
        event1DetailChecker(event.detail);
      };
      event1DetailChecker = vi.fn();
      callbackIfNotCancelled = vi.fn();
    });
    afterEach(cleanup);

    const renderTemplate = async (prevent = false) => {
      render(
        html`<geai-event-dummy-component
          @event1=${prevent ? event1CancellableHandler : event1Handler}
        ></geai-event-dummy-component>`
      );

      dummyComponentRef = document.querySelector("geai-event-dummy-component")!;
      await dummyComponentRef.updateComplete;
    };

    it(`should emit the event1 one time`, async () => {
      renderTemplate();
      dummyComponentRef.fireEvent1WithDetail("test");
      expect(event1DetailChecker).toBeCalledTimes(1);
    });

    it(`should emit the event1 with detail = "test"`, async () => {
      renderTemplate();
      dummyComponentRef.fireEvent1WithDetail("test");
      expect(event1DetailChecker).toBeCalledWith("test");
    });

    it(`should not prevent the event 1 by default`, async () => {
      renderTemplate();
      dummyComponentRef.fireEvent1WithPrevent(callbackIfNotCancelled);
      expect(event1DetailChecker).toBeCalledTimes(1);
      expect(callbackIfNotCancelled).toBeCalledTimes(1);
    });

    it(`should prevent the event 1 when calling preventDefault in the handler`, async () => {
      renderTemplate(true);
      dummyComponentRef.fireEvent1WithPrevent(callbackIfNotCancelled);
      expect(event1DetailChecker).toBeCalledTimes(1);
      expect(callbackIfNotCancelled).toBeCalledTimes(0);
    });
  });
});

declare global {
  interface HTMLElementTagNameMap {
    "geai-event-dummy-component": DummyComponent;
  }
}

