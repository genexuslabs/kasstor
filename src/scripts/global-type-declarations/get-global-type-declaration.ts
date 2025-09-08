import { capitalize } from "../capitalize";
import type {
  ComponentDefinition,
  ComponentDefinitionEvents
} from "../library-summary/types";

const JSDOC_CLOSE_TAG_REGEX = /\*+\//g;
const EMPTY_JSDOC_REGEX = /\/\*+\//g;

export const getComponentHTMLInterfaceName = <T extends string>(className: T) =>
  `HTML${className}Element` as const;

export const getComponentCustomEventInterfaceName = <T extends string>(
  className: T
) => `${getComponentHTMLInterfaceName(className)}CustomEvent` as const;

// TODO: We could have some issues if there is a custom event called "custom"
export const getComponentEventTypeInterfaceName = <
  Class extends string,
  Event extends string
>(
  className: Class,
  eventName: Event
) =>
  `${getComponentHTMLInterfaceName(className)}${capitalize(eventName)}Event` as const;

export const getComponentEventMapInterfaceName = <T extends string>(
  className: T
) => `${getComponentHTMLInterfaceName(className)}EventMap` as const;

export const getComponentEventTypesInterfaceName = <T extends string>(
  className: T
) => `${getComponentHTMLInterfaceName(className)}EventTypes` as const;

export const getComponentEventDefinitions = ({
  className
}: ComponentDefinition) => `// prettier-ignore
  interface ${getComponentCustomEventInterfaceName(className)}<T> extends CustomEvent<T> {
    detail: T;
    target: ${getComponentHTMLInterfaceName(className)};
  }`;

export const getComponentCustomEventExtend = ({
  className,
  events,
  tagName
}: ComponentDefinition) =>
  !events || events.length === 0
    ? ""
    : events
        .map(
          event => `

  /** Type of the \`${tagName}\`'s \`${event.name}\` event. */
  // prettier-ignore
  type ${getComponentEventTypeInterfaceName(className, event.name)} = ${getComponentCustomEventInterfaceName(className)}<
    ${getComponentEventMapInterfaceName(className)}["${event.name}"]
  >;`
        )
        .join("\n");

export const getComponentEventMapAndTypes = ({
  className,
  events
}: ComponentDefinition) =>
  !events || events.length === 0
    ? ""
    : `

  interface ${getComponentEventMapInterfaceName(className)} {
    ${events.map(event => `${event.name}: ${event.detailType};`).join("\n    ")}
  }

  interface ${getComponentEventTypesInterfaceName(className)} {
    ${events.map(event => `${event.name}: ${getComponentEventTypeInterfaceName(className, event.name)};`).join("\n    ")}
  }`;

const getComponentAddEventListener = <Class extends string>(
  className: Class,
  events: ComponentDefinitionEvents | undefined
) =>
  !events || events.length === 0
    ? ""
    : (`
    /* prettier-ignore */ addEventListener<K extends keyof ${getComponentEventTypesInterfaceName(className)}>(type: K, listener: (this: ${getComponentHTMLInterfaceName(className)}, ev: ${getComponentEventTypesInterfaceName(className)}[K]) => unknown, options?: boolean | AddEventListenerOptions): void;` as const);

const getComponentRemoveEventListener = <Class extends string>(
  className: Class,
  events: ComponentDefinitionEvents | undefined
) =>
  !events || events.length === 0
    ? ""
    : (`
    /* prettier-ignore */ removeEventListener<K extends keyof ${getComponentEventTypesInterfaceName(className)}>(type: K, listener: (this: ${getComponentHTMLInterfaceName(className)}, ev: ${getComponentEventTypesInterfaceName(className)}[K]) => unknown, options?: boolean | EventListenerOptions): void;` as const);

const alignJSDoc = (jsDoc: string) => "\n  " + jsDoc.split("\n").join("\n  ");

export const getFullJSDocWithFiresTags = (
  fullClassJSDoc: string,
  events: ComponentDefinitionEvents | undefined
) => {
  if (!events || events.length === 0) {
    return alignJSDoc(fullClassJSDoc);
  }

  let fullClassJSDocWithFires = fullClassJSDoc.trim();

  // Set a default empty JSDoc when the description is not provided
  if (fullClassJSDocWithFires === "") {
    fullClassJSDocWithFires = "/***/";
  }

  const splittedJSDoc = fullClassJSDocWithFires.split("\n");

  // Empty JSDocs are processed differently, to ensure the start tag is
  // placed correctly
  if (splittedJSDoc.length === 1 && splittedJSDoc[0].match(EMPTY_JSDOC_REGEX)) {
    splittedJSDoc[0] = "/**";
  } else {
    // Remove close tag "*/"
    splittedJSDoc[splittedJSDoc.length - 1] = splittedJSDoc
      .at(-1)!
      .replace(JSDOC_CLOSE_TAG_REGEX, "")
      .trim();

    const lastLineIsEmpty = splittedJSDoc.at(-1) === "";
    if (lastLineIsEmpty) {
      splittedJSDoc[splittedJSDoc.length - 1] = " *";
    }
  }

  // Concat events
  events.forEach(event =>
    splittedJSDoc.push(
      ` * @fires ${event.name} ${event.description?.replaceAll("\n", "\n *   ")}`
    )
  );

  // Add close tag
  splittedJSDoc.push(" */");

  fullClassJSDocWithFires = splittedJSDoc.join("\n");

  return alignJSDoc(fullClassJSDocWithFires);
};

export const getComponentClassExtend = ({
  className,
  fullClassJSDoc,
  events
}: ComponentDefinition) => `
${getFullJSDocWithFiresTags(fullClassJSDoc, events)}
  // prettier-ignore
  interface ${getComponentHTMLInterfaceName(className)} extends ${className} {
    // Extend the ${className} class redefining the event listener methods to improve type safety when using them${getComponentAddEventListener(className, events)}
    /* prettier-ignore */ addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    /* prettier-ignore */ addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    /* prettier-ignore */ addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    ${getComponentRemoveEventListener(className, events)}
    /* prettier-ignore */ removeEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    /* prettier-ignore */ removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    /* prettier-ignore */ removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }`;

export const getExtendTagNameMap = ({
  className,
  tagName
}: ComponentDefinition) => `
  interface HTMLElementTagNameMap {
    "${tagName}": ${getComponentHTMLInterfaceName(className)};
  }`;

export const getComponentGlobalTypeDeclaration = (
  component: ComponentDefinition
) => `
declare global {
  ${getComponentEventDefinitions(component)}${getComponentCustomEventExtend(component)}${getComponentEventMapAndTypes(component)}${getComponentClassExtend(component)}
  ${getExtendTagNameMap(component)}
}\r\n\r\n`;

