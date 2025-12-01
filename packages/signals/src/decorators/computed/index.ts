/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed } from "alien-signals";
import { getStoredSignalsForClassInstance } from "../store.js";

const getComputedRefAndCreateItIfNecessary = <T>(
  instance: object,
  propName: string,
  fn: (this: any) => T
) => {
  const storedClassInstance = getStoredSignalsForClassInstance(instance);
  let computedRef = storedClassInstance[propName];

  if (!computedRef) {
    computedRef = computed(() => fn.call(this));
    storedClassInstance[propName] = computedRef;
  }

  return computedRef;
};

/**
 * Decorates a getter so that accessing it returns a computed value,
 * and exposes raw computed as this.$prop.
 */
export function ComputedProp<T>(fn: (this: any) => T) {
  return function (target: any, propKey: string | symbol) {
    const propName = String(propKey);

    Object.defineProperty(target, propName, {
      configurable: true,
      enumerable: true,

      get(this: any) {
        return getComputedRefAndCreateItIfNecessary(this, propName, fn)();
      },

      set() {
        throw new Error(`Cannot assign to computed property '${propName}'.`);
      }
    });

    // Raw computed signal
    Object.defineProperty(target, `$${propName}`, {
      configurable: true,
      enumerable: false,

      get(this: any) {
        return getComputedRefAndCreateItIfNecessary(this, propName, fn);
      }
    });
  };
}
