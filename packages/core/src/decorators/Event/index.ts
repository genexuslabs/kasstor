import type { LitElement } from "lit";
import { DEV_MODE } from "../../development-flags";

/**
 * Symbol to store event emitter instances
 */
const EVENT_EMITTERS = Symbol("event-emitters");

/**
 * Typed emitter for a single custom event. Created by the `@Event()` decorator;
 * do not instantiate directly. Use the property to call {@link EventEmitter.emit}.
 */
export class EventEmitter<T> {
  constructor(
    private target: HTMLElement,
    private eventName: string,
    private generalOptions?: EventInit
  ) {}

  /**
   * Dispatches a CustomEvent and returns it (e.g. to check `defaultPrevented`).
   *
   * @param value - Event detail (stored in `event.detail`). Optional.
   * @param options - Override decorator defaults for this emit (bubbles, cancelable, composed).
   * @returns The dispatched CustomEvent.
   *
   * @example
   * ```ts
   * const eventInfo = this.myEvent.emit(detail);
   * if (eventInfo.defaultPrevented) {
   *   // Do something if the event was cancelled
   * }
   * ```
   */
  emit(value?: T, options?: EventInit) {
    const customEvent = new CustomEvent<T>(this.eventName, {
      detail: value,

      // By default, events should be cancelable and should bubble
      cancelable: true,
      bubbles: true,
      ...(options ?? this.generalOptions)
    });
    this.target.dispatchEvent(customEvent);

    return customEvent;
  }
}

/**
 * Declares a custom DOM event that the component can emit, with typed detail and optional default options.
 *
 * Usage:
 * - The decorated property is an {@link EventEmitter}. Call `this.myEvent.emit(detail)` to dispatch a `CustomEvent`.
 * - The event name is the property name as a string (casing is preserved). Listeners get `event.detail` and can call `preventDefault()`.
 *
 * @param defaultOptions - Default options for every emit (bubbles, cancelable, composed). Overridable per call via {@link EventEmitter.emit}.
 *
 * Restrictions:
 * - Apply only to a **property** (not a method). Type the property as `EventEmitter<Detail>`.
 * - Emitter is created lazily per instance.
 *
 * @throws In development, throws if applied to a method (descriptor is present).
 *
 * @example
 * ```ts
 * \@Event() protected myEvent!: EventEmitter<EventDetailType>;
 *
 * #performEvent = () => {
 *   this.myEvent.emit(detail, { bubbles: false });
 * };
 * ```
 */
export function Event<T>(defaultOptions?: EventInit) {
  return function <ElementClass extends LitElement>(
    target: ElementClass,
    eventName: string | symbol,
    descriptor?: PropertyDescriptor
  ) {
    // If the user passes a description, it is a method which it is not allowed
    if (DEV_MODE && descriptor) {
      throw new Error("@Event can only be applied to properties, not methods");
    }

    // Define the getter for the eventName
    Object.defineProperty(target, eventName, {
      get: function (this: ElementClass) {
        // Lazy initialization of EventEmitter for the class
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any)[EVENT_EMITTERS] ??= new Map();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emitters = (this as any)[EVENT_EMITTERS] as Map<
          string | symbol,
          EventEmitter<T>
        >;

        if (!emitters.has(eventName)) {
          const emitter = new EventEmitter<T>(
            this,
            String(eventName),
            defaultOptions
          );
          emitters.set(eventName, emitter);
        }

        return emitters.get(eventName)!;
      },
      // set: function () {
      //   throw new Error(`Cannot set EventEmitter property '${String(propertyKey)}'. EventEmitters are read-only.`);
      // },
      enumerable: true,
      configurable: true
    });
  };
}
