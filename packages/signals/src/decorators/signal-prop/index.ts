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
 * Turns a class property into a reactive signal. Read and write the property normally; use `$propName` for the raw signal when passing to {@link watch} or when you need the signal function (e.g. for `trigger`).
 *
 * Behavior:
 * - Reading/writing the property (e.g. `this.count`, `this.count = 5`) uses the underlying signal.
 * - `this.$propName` is the raw signal getter/setter for use with `watch` or when you need the signal (e.g. `trigger(this.$count)`).
 * - **Changes to the property do not trigger component re-renders.** In Lit, use the `watch` directive in the template so the UI updates when the value changes.
 * - You can use the property inside `computed` and `effect`: reading `this.propName` tracks the underlying signal, so the computed or effect updates when the property changes.
 *
 * Typing `this.$propName`: For correct TypeScript types when using `this.$propName`, add a `declare` for the raw signal with type `KasstorSignalState<MyClass["propName"]>`. Import the type from the package (e.g. `import type { KasstorSignalState } from "@genexus/kasstor-signals"`).
 *
 * Restrictions:
 * - Apply to class instance fields (not to accessors in a way that conflicts). Initializer value is used as the signal's initial value.
 *
 * @example
 * ```ts
 * import type { KasstorSignalState } from "@genexus/kasstor-signals";
 *
 * \@Component({ tag: "my-component" })
 * class MyComponent extends KasstorElement {
 *   declare $count: KasstorSignalState<MyComponent["count"]>;
 *
 *   \@SignalProp count: number = 0;
 *   override render() {
 *     return html`<p>${watch(this.$count)}</p>`;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * class Counter {
 *   \@SignalProp count: number = 0;
 *
 *   doubleCount = computed(() => this.count * 2);
 * }
 *
 * const c = new Counter();
 * c.count = 5;
 * console.log(c.doubleCount()); // 10
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
