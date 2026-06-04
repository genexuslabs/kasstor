import {
  getComponentCustomEventInterfaceName,
  getComponentEventMapInterfaceName,
  getComponentEventTypeInterfaceName,
  getComponentEventTypesInterfaceName,
  getComponentHTMLInterfaceName
} from "../global-type-declarations/get-global-type-declaration.js";
import type { ComponentDefinition, LibraryComponents } from "../typings/library-components";
import { getImportClassName } from "./get-import-class-name.js";

/**
 * Generates the `declare global` block (custom-element element types, event
 * maps, typed `addEventListener`/`removeEventListener`, `HTMLElementTagNameMap`
 * and `IntrinsicElements`) for every component, to be emitted inside the
 * `components.ts` file.
 *
 * Previously this content was appended at the end of each `*.lit.ts` file. It
 * now lives in a single, framework-agnostic `declare global` in `components.ts`,
 * which:
 *   - makes `components.ts` self-contained (its `ComponentEvents` namespace and
 *     the per-framework JSX files already reference these global types),
 *   - lets us emit it more compactly (one `declare global`, no marker comment,
 *     no `// prettier-ignore`, no auto-generated `@fires` tags),
 *   - references the component class by its imported (aliased) name, since the
 *     class is imported into `components.ts` (e.g. `KstField as KstFieldElement`).
 */

const hasEvents = (component: ComponentDefinition): boolean =>
  !!component.events && component.events.length !== 0;

/** Indents the component's full class JSDoc to the `declare global` body. */
const indentClassJSDoc = (fullClassJSDoc: string) => "  " + fullClassJSDoc.split("\n").join("\n  ");

/** `interface HTML<X>ElementCustomEvent<T> extends CustomEvent<T> { … }`. */
const getCustomEventInterface = ({ className }: ComponentDefinition) =>
  `  interface ${getComponentCustomEventInterfaceName(className)}<T> extends CustomEvent<T> {
    detail: T;
    target: ${getComponentHTMLInterfaceName(className)};
  }`;

/** One `type HTML<X>Element<Event>Event = …` alias per event. */
const getEventTypeAliases = ({ className, events, tagName }: ComponentDefinition) =>
  events!
    .map(
      event => `  /** Type of the \`${tagName}\`'s \`${event.name}\` event. */
  type ${getComponentEventTypeInterfaceName(className, event.name)} = ${getComponentCustomEventInterfaceName(className)}<
    ${getComponentEventMapInterfaceName(className)}["${event.name}"]
  >;`
    )
    .join("\n\n");

/** `interface HTML<X>ElementEventMap { … }`. */
const getEventMapInterface = ({ className, events }: ComponentDefinition) =>
  `  interface ${getComponentEventMapInterfaceName(className)} {
    ${events!.map(event => `${event.name}: ${event.detailType};`).join("\n    ")}
  }`;

/** `interface HTML<X>ElementEventTypes { … }`. */
const getEventTypesInterface = ({ className, events }: ComponentDefinition) =>
  `  interface ${getComponentEventTypesInterfaceName(className)} {
    ${events!.map(event => `${event.name}: ${getComponentEventTypeInterfaceName(className, event.name)};`).join("\n    ")}
  }`;

/**
 * Typed `addEventListener`/`removeEventListener` overloads for the host element
 * interface. Only generated for components with events; eventless components
 * inherit the standard listeners from `HTMLElement`.
 */
const getEventListenerOverloads = ({ className }: ComponentDefinition) => {
  const host = getComponentHTMLInterfaceName(className);
  const eventTypes = getComponentEventTypesInterfaceName(className);

  return `
    // Extend the ${className} class redefining the event listener methods to improve type safety when using them
    addEventListener<K extends keyof ${eventTypes}>(type: K, listener: (this: ${host}, ev: ${eventTypes}[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof ${eventTypes}>(type: K, listener: (this: ${host}, ev: ${eventTypes}[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  `;
};

/**
 * `interface HTML<X>Element extends <ImportedClass> { … }`. The component class
 * is referenced by its imported (aliased) name (e.g. `KstFieldElement`).
 */
const getHostElementInterface = (component: ComponentDefinition) => {
  const { className, fullClassJSDoc } = component;
  const host = getComponentHTMLInterfaceName(className);
  const classRef = getImportClassName(className);
  const body = hasEvents(component) ? getEventListenerOverloads(component) : "";

  return `${indentClassJSDoc(fullClassJSDoc)}
  interface ${host} extends ${classRef} {${body}}`;
};

/** All declarations for a single component, as 2-space-indented blocks. */
const getComponentDeclarations = (component: ComponentDefinition): string[] => {
  const declarations: string[] = [];

  if (hasEvents(component)) {
    declarations.push(
      getCustomEventInterface(component),
      getEventTypeAliases(component),
      getEventMapInterface(component),
      getEventTypesInterface(component)
    );
  }

  declarations.push(getHostElementInterface(component));

  return declarations;
};

/** Single `interface <name> { "<tag>": HTML<X>Element; … }` for all tags. */
const getTagMapInterface = (
  components: LibraryComponents,
  interfaceName: "HTMLElementTagNameMap" | "IntrinsicElements"
) =>
  `  interface ${interfaceName} {
    ${components.map(({ className, tagName }) => `"${tagName}": ${getComponentHTMLInterfaceName(className)};`).join("\n    ")}
  }`;

export const getGlobalTypeDeclarations = (components: LibraryComponents) =>
  `declare global {
${[
  ...components.flatMap(getComponentDeclarations),
  getTagMapInterface(components, "IntrinsicElements"),
  getTagMapInterface(components, "HTMLElementTagNameMap")
].join("\n\n")}
}`;
