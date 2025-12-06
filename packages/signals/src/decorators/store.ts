import type { KasstorSignal } from "../typings/types";

/**
 * Global store that maps instance -> { propName -> signal/computed }
 */
const STORE = new WeakMap<object, Record<string, KasstorSignal>>();

export const getStoredSignalsForClassInstance = (instance: object) => {
  let classInstance = STORE.get(instance);

  if (!classInstance) {
    classInstance = {};
    STORE.set(instance, classInstance);
  }

  return classInstance;
};
