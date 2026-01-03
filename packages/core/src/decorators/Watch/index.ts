import type { PropertyValues } from "lit";
import { DEV_MODE } from "../../development-flags.js";
import type { KasstorElement } from "../Component/index.js";

type WatchDecoratorUpdateHandler<T> = (newValue?: T, oldValue?: T) => void;

/**
 * Map to store watch configurations for each class
 */
const watchersForEachClass = new WeakMap<
  typeof KasstorElement,
  Map<string | symbol, WatchDecoratorUpdateHandler<unknown>>
>();

/**
 * Runs when observed properties change, e.g. `@property` or `@state`, but
 * before the component updates. To wait for an update to complete after a
 * change occurs, use `await this.updateComplete` in the handler. To start
 * watching before the initial update/render, use `{ waitUntilFirstUpdate: false }`.
 *
 * Usage with accessor:
 * ```ts
 * \@Watch("propName")
 * protected propNameChanged(newValue?: unknown, oldValue?: unknown) {
 *   ...
 * }
 *
 * \@Watch(["propName1", "propName2", ...])
 * protected propNameChanged(newValue?: unknown, oldValue?: unknown) {
 *   ...
 * }
 * ```
 */
export function Watch(propertyOrProperties: string | string[]) {
  return function <ElementClass extends KasstorElement>(
    target: ElementClass,
    _: unknown,
    descriptor: PropertyDescriptor
  ) {
    const watchHandler =
      descriptor.value as WatchDecoratorUpdateHandler<unknown>;
    const watchedProperties =
      typeof propertyOrProperties === "string"
        ? [propertyOrProperties]
        : propertyOrProperties;

    // TODO: Add a unit test for this error
    if (DEV_MODE && typeof watchHandler !== "function") {
      throw new Error("@Watch can only be applied to methods");
    }

    if (DEV_MODE) {
      const propertiesThatCanNotBeWatched = watchedProperties.filter(
        propertyName => !(propertyName in target)
      );

      if (propertiesThatCanNotBeWatched.length !== 0) {
        throw new Error(
          `@Watch can only be applied to @property or @state. The "${propertiesThatCanNotBeWatched[0]}" property doesn't accomplish this`
        );
      }
    }

    const ctor = target.constructor as typeof KasstorElement;
    const watchCallbackIsAlreadyDefined = watchersForEachClass.has(ctor);

    if (!watchCallbackIsAlreadyDefined) {
      watchersForEachClass.set(ctor, new Map());
    }

    // TODO: Test if we can define multiple watches for the same property
    // TODO: Test SSR support
    // TODO: Test if we can define an array of properties in a Watch
    const watchersForTheCurrentClass = watchersForEachClass.get(ctor)!;

    // Add new properties to watch for the target class
    for (const prop of watchedProperties) {
      watchersForTheCurrentClass.set(prop, watchHandler);
    }

    // Override the `watchCallback` method only once per class, even if
    // multiple `@Watch` decorators are used for the same class
    if (watchCallbackIsAlreadyDefined) {
      return descriptor;
    }

    // @ts-expect-error - `kasstorWatchCallback` is not defined in the interface
    // but it is used internally by the KasstorElement class
    // TODO: Find a better way of doing this without proving a waterfall in the
    // initial load, by using an external symbol that is referenced here and in
    // the KasstorElement
    ctor.prototype.kasstorWatchCallback = function (
      this: ElementClass,
      changedProps: PropertyValues<keyof ElementClass>
    ) {
      // It's defined, because we verify that at the beginning
      const watchers = watchersForEachClass.get(ctor)!;

      for (const [watchedProp, handler] of watchers) {
        const key = watchedProp as keyof ElementClass;

        if (changedProps.has(key)) {
          const oldValue = changedProps.get(key);
          const newValue = this[key];

          if (oldValue !== newValue) {
            // TODO: Add a test to validate that this handler is only called
            // once even if watching an array of properties that are changed
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

