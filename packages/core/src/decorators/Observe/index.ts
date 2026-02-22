import type { PropertyValues } from "lit";
import { DEV_MODE } from "../../development-flags.js";
import type { KasstorElement } from "../Component/index.js";

type ObserveDecoratorUpdateHandler<T> = (newValue?: T, oldValue?: T) => void;

/**
 * Map to store watch configurations for each class
 */
const observersForEachClass = new WeakMap<
  typeof KasstorElement,
  Map<string | symbol, ObserveDecoratorUpdateHandler<unknown>>
>();

/**
 * Executes the decorated method when any of the observed properties change.
 *
 * @param propertyOrProperties - One property name or an array. Must be reactive properties on the class (e.g. `@property` or `@state`).
 *
 * Behavior:
 * - Callback runs in sync before `willUpdate` (and before `firstWillUpdate`).
 * - On initial load, runs only if the initial value is not `undefined`.
 * - Works with SSR.
 * - Setting a property inside the callback does not trigger an extra update.
 *
 * Restrictions:
 * - Must be applied to a **method** (callback receives `newValue`, `oldValue`).
 * - Observed names must exist on the class and be reactive properties (e.g. `@property` or `@state`); otherwise a development-only error is thrown.
 *
 * @throws In development, throws if applied to a non-function or if a listed property does not exist.
 *
 * @example
 * ```ts
 * \@state() propBoolean: boolean = false;
 * \@property() propString: string | undefined;
 *
 * \@Observe("propString")
 * protected propStringChanged(newValue?: unknown, oldValue?: unknown) { ... }
 *
 * \@Observe(["propBoolean", "propNumber"])
 * protected propsChanged(newValue?: unknown, oldValue?: unknown) { ... }
 * ```
 */
export function Observe(propertyOrProperties: string | string[]) {
  return function <ElementClass extends KasstorElement>(
    target: ElementClass,
    _: unknown,
    descriptor: PropertyDescriptor
  ) {
    const observeHandler =
      descriptor.value as ObserveDecoratorUpdateHandler<unknown>;
    const observedProperties =
      typeof propertyOrProperties === "string"
        ? [propertyOrProperties]
        : propertyOrProperties;

    // TODO: Add a unit test for this error
    if (DEV_MODE && typeof observeHandler !== "function") {
      throw new Error("@Observe can only be applied to methods");
    }

    if (DEV_MODE) {
      const propertiesThatCanNotBeObserved = observedProperties.filter(
        propertyName => !(propertyName in target)
      );

      if (propertiesThatCanNotBeObserved.length !== 0) {
        throw new Error(
          `The ${propertiesThatCanNotBeObserved.map(prop => `"${prop}"`).join(", ")} ${propertiesThatCanNotBeObserved.length === 1 ? "property" : "properties"} can not be observed, because the @Observe can only be applied to @property or @state.`
        );
      }
    }

    const ctor = target.constructor as typeof KasstorElement;
    const observeCallbackIsAlreadyDefined = observersForEachClass.has(ctor);

    if (!observeCallbackIsAlreadyDefined) {
      observersForEachClass.set(ctor, new Map());
    }

    // TODO: Test if we can define multiple Observes for the same property
    // TODO: Test SSR support
    // TODO: Test if we can define an array of properties in a Observe
    const observersForTheCurrentClass = observersForEachClass.get(ctor)!;

    // Add new properties to observe for the target class
    for (const prop of observedProperties) {
      observersForTheCurrentClass.set(prop, observeHandler);
    }

    // Override the `observeCallback` method only once per class, even if
    // multiple `@Observe` decorators are used for the same class
    if (observeCallbackIsAlreadyDefined) {
      return descriptor;
    }

    // @ts-expect-error - `kasstorObserveCallback` is not defined in the interface
    // but it is used internally by the KasstorElement class
    // TODO: Find a better way of doing this without proving a waterfall in the
    // initial load, by using an external symbol that is referenced here and in
    // the KasstorElement
    ctor.prototype.kasstorObserveCallback = function (
      this: ElementClass,
      changedProps: PropertyValues<keyof ElementClass>
    ) {
      // It's defined, because we verify that at the beginning
      const observers = observersForEachClass.get(ctor)!;

      for (const [observedProp, handler] of observers) {
        const key = observedProp as keyof ElementClass;

        if (changedProps.has(key)) {
          const oldValue = changedProps.get(key);
          const newValue = this[key];

          if (oldValue !== newValue) {
            // TODO: Add a test to validate that this handler is only called
            // once even if observing an array of properties that are changed
            // at the same time.
            // Call the handler function directly with the correct context
            handler.call(this, newValue, oldValue);
          }
        }
      }
    };

    return descriptor;
  };
}

