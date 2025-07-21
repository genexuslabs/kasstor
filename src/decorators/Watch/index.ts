import type { LitElement } from "lit";
import { DEV_MODE } from "../../development-flags";

type WatchDecoratorUpdateHandler<T> = (newValue?: T, oldValue?: T) => void;

interface WatchOptions {
  /**
   * If `true`, will only start watching after the initial update/render
   */
  waitUntilFirstUpdate?: boolean;
}

/**
 * Symbol to mark classes that have already had their update method overridden
 */
const WATCH_UPDATE_OVERRIDDEN = Symbol("watch-update-overridden");

/**
 * Map to store watch configurations for each class
 */
const watchersForEachClass = new WeakMap<
  typeof LitElement,
  Map<
    string | symbol,
    { handler: WatchDecoratorUpdateHandler<unknown>; options: WatchOptions }
  >
>();

/**
 * Runs when observed properties change, e.g. `@property` or `@state`, but
 * before the component updates. To wait for an update to complete after a
 * change occurs, use `await this.updateComplete` in the handler. To start
 * watching before the initial update/render, use `{ waitUntilFirstUpdate: false }`.
 *
 * Usage with accessor:
 * ```ts
 *   @Watch("propName")
 *   protected propNameChanged(newValue?: unknown, oldValue?: unknown) {
 *     ...
 *   }
 *
 *   @Watch(["propName1", "propName2", ...])
 *   protected propNameChanged(newValue?: unknown, oldValue?: unknown) {
 *     ...
 *   }
 * ```
 */
export function Watch(
  propertyOrProperties: string | string[],
  options?: WatchOptions
) {
  const waitUntilFirstUpdate = options?.waitUntilFirstUpdate ?? true;

  return function <ElementClass extends LitElement>(
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

    const ctor = target.constructor as typeof LitElement;
    const { prototype } = ctor;

    if (!watchersForEachClass.has(ctor)) {
      watchersForEachClass.set(ctor, new Map());
    }

    // TODO: Test if we can define multiple watches for the same property
    // TODO: Test if we can define an array of properties in a Watch
    const watchersForTheCurrentClass = watchersForEachClass.get(ctor)!;

    // Add new properties to watch for the target class
    for (const prop of watchedProperties) {
      watchersForTheCurrentClass.set(prop, {
        handler: watchHandler,
        options: { waitUntilFirstUpdate }
      });
    }

    // Override the update method only once per class, even if multiple Watch
    // decorators are used for the same class
    if (prototype[WATCH_UPDATE_OVERRIDDEN]) {
      return descriptor;
    }
    // Mark as overridden using Symbol
    prototype[WATCH_UPDATE_OVERRIDDEN] = true;

    // @ts-expect-error - update is a protected property
    const originalUpdate = prototype.update;

    // We add some behavior to the update implementation in order to implement
    // the decorator
    // @ts-expect-error - update is a protected property
    prototype.update = function (
      this: ElementClass,
      changedProps: Map<keyof ElementClass, ElementClass[keyof ElementClass]>
    ) {
      // It's defined, because we verify that at the beginning
      const watchers = watchersForEachClass.get(ctor)!;

      for (const [watchedProp, config] of watchers) {
        const key = watchedProp as keyof ElementClass;

        if (changedProps.has(key)) {
          const oldValue = changedProps.get(key);
          const newValue = this[key];

          if (
            oldValue !== newValue &&
            (!config.options.waitUntilFirstUpdate || this.hasUpdated)
          ) {
            // TODO: Add a test to validate that this handler is only called
            //       once even if watching an array of properties that are
            //       changed at the same time.
            // Call the handler function directly with the correct context
            config.handler.call(this, newValue, oldValue);
          }
        }
      }

      // Call the original update method
      originalUpdate.call(this, changedProps);
    };

    return descriptor;
  };
}
