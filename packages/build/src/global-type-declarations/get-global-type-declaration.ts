import { capitalize } from "../internal/capitalize.js";

export const getComponentHTMLInterfaceName = <T extends string>(className: T) =>
  `HTML${className}Element` as const;

export const getComponentCustomEventInterfaceName = <T extends string>(className: T) =>
  `${getComponentHTMLInterfaceName(className)}CustomEvent` as const;

// TODO: We could have some issues if there is a custom event called "custom"
export const getComponentEventTypeInterfaceName = <Class extends string, Event extends string>(
  className: Class,
  eventName: Event
) => `${getComponentHTMLInterfaceName(className)}${capitalize(eventName)}Event` as const;

export const getComponentEventMapInterfaceName = <T extends string>(className: T) =>
  `${getComponentHTMLInterfaceName(className)}EventMap` as const;

export const getComponentEventTypesInterfaceName = <T extends string>(className: T) =>
  `${getComponentHTMLInterfaceName(className)}EventTypes` as const;

/**
 * Aligns a component's full class JSDoc to the indentation used inside the
 * generated `declare global` block (in `components.ts`) and inside the
 * per-framework `IntrinsicElements` interfaces.
 */
export const getAlignedClassJSDoc = (fullClassJSDoc: string) =>
  "\n  " + fullClassJSDoc.split("\n").join("\n  ");
