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
 * Turns a class field into a reactive signal-backed property.
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

