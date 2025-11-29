import type { LitElement } from "lit";
import { DEV_MODE } from "../../development-flags";

/**
 * Symbol to store event emitter instances
 */
const EVENT_EMITTERS = Symbol("event-emitters");

export class EventEmitter<T> {
  constructor(
    private target: HTMLElement,
    private eventName: string,
    private generalOptions?: EventInit
  ) {}

  /**
   * Emits the CustomEvent with the details information (if any) and returns
   * a reference for the CustomEvent emitted. This reference can be used to
   * know if the event was prevented, for example:
   *
   * ```ts
   * const eventInfo = this.myEvent.emit(detail);
   *
   * if (eventInfo.defaultPrevented) {
   *   // Do something...
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
 * Components can emit data and events using the `Event` decorator. To dispatch
 * Custom DOM events for other components to handle, use the `@Event()`
 * decorator.
 *
 * The Event decorator also makes it easier to automatically build types and
 * documentation for the event data.
 *
 * @param defaultOptions Options used by default when emitting the event.
 * In some scenarios the event options must be different and for that you can
 * pass a different set of options in the emit function:
 *
 *
 * @example
 * ```tsx
 * \@Event() protected myEvent: EventEmitter<EventDetailType>;
 *
 * #performEvent = () => {
 *   this.myEvent.emit(detail, { another options });
 * }
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

