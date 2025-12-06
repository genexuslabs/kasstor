/* eslint-disable @typescript-eslint/no-explicit-any */
import { signal } from "alien-signals";
import { getStoredSignalsForClassInstance } from "../store.js";

const getSignalRefAndCreateItIfNecessary = (
  instance: object,
  propName: string
) => {
  const storedClassInstance = getStoredSignalsForClassInstance(instance);
  let signalRef = storedClassInstance[propName];

  if (!signalRef) {
    signalRef = signal(undefined);
    storedClassInstance[propName] = signalRef;

    // If the property existed directly on the instance (initializer),
    // read and delete it so the signal picks it up.
    if (Object.prototype.hasOwnProperty.call(instance, propName)) {
      const initialValue = (instance as any)[propName];
      delete (instance as any)[propName];

      // Set the signal value
      signalRef(initialValue);
    }
  }

  return signalRef;
};

/**
 * Decorator that makes a class property into a signal. The property
 * can be accessed and modified directly, and the changes will be
 * reflected in any `computed` values or `effect`s that depend on it.
 *
 * You can also use `$propertyName` to access the raw signal reference.
 *
 * When used in a LitElement component, changes to the property will NOT
 * trigger component updates. Use the `watch` directive to reflect
 * the signal value in the component template.
 *
 * @example
 * ```typescript
 * import { Component, SSRLitElement } from "@genexus/kasstor-core/decorators/component.js";
 * import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";
 * import { watch } from "@genexus/kasstor-signals/directives/watch.js";
 * import { html } from "lit";
 *
 * \@Component({ tag: "my-component" })
 * class MyComponent extends SSRLitElement {
 *  \@SignalProp count: number = 0;
 *
 * override render() {
 *   return html`<p>Count value: ${watch(this.$count)}</p>`;
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { computed } from "@genexus/kasstor-signals";
 * import { SignalProp } from "@genexus/kasstor-signals/decorators/signal-prop.js";
 *
 * class Counter {
 *   \@SignalProp count: number = 0;
 *
 *   doubleCount = computed(() => this.count * 2);
 * }
 *
 * const counter = new Counter();
 * console.log(counter.count); // 0
 * console.log(counter.$count()); // 0
 * console.log(counter.doubleCount); // 0
 *
 * counter.count = 5;
 * console.log(counter.count); // 5
 * console.log(counter.$count()); // 5
 * console.log(counter.doubleCount); // 10
 * ```
 */
export function SignalProp<Target extends object>(
  target: Target,
  propKey: string | symbol
): void {
  const propName = String(propKey);

  Object.defineProperty(target, propName, {
    configurable: true,
    enumerable: true,

    get(this: Target) {
      return getSignalRefAndCreateItIfNecessary(this, propName)();
    },

    set(this: Target, newValue: any) {
      const storedClassInstance = getStoredSignalsForClassInstance(this);
      let signalRef = storedClassInstance[propName];

      if (!signalRef) {
        // Create signal directly with value
        signalRef = signal(newValue);
        storedClassInstance[propName] = signalRef;
        return;
      }

      signalRef(newValue);
    }
  });

  // Define $propName for accessing raw signal
  Object.defineProperty(target, `$${propName}`, {
    configurable: true,
    enumerable: false,

    get(this: any) {
      return getSignalRefAndCreateItIfNecessary(this, propName);
    }
  });
}

