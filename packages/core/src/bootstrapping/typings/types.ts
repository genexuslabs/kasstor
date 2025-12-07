import type { LibraryComponents, LibraryPrefix } from "./library-components";
import type { CustomElementTagNames } from "./non-standard-elements";

export type CustomElementExplicitDependencies<ElementItself = string> = Exclude<
  CustomElementTagNames | (string & {}),
  // Exclude the tag itself, as it is not a dependency
  ElementItself
>[];

export type CustomElementDependencies<ElementItself = string> =
  | CustomElementExplicitDependencies<ElementItself>
  | "never-observe"
  | "always-observe";

export type LibraryLoaderOptions<Prefix extends LibraryPrefix> = {
  libraryPrefix: Prefix;
  libraryName: string;

  defaultCustomElementWatchingBehavior: Extract<
    CustomElementDependencies,
    "never-observe" | "always-observe"
  >;

  customElements: {
    [tagName in LibraryComponents<Prefix>]: {
      loader: () => Promise<unknown>;

      /**
       * Include the dependencies of your library's custom element tag.
       *
       * This property is important to **optimize** the render performance of
       * your library, by avoid observing mutations in custom elements that
       * don't use any other custom element, or where its dependencies are
       * already defined.
       *
       *  - `"never-observe"`: It means that the custom element doesn't have
       *    any dependencies, so it will not be observed for mutations in its
       *    Shadow Root.
       *
       *  - `"always-observe"`: The custom element will **always** be observed
       *    for mutations in its Shadow Root.
       *
       *  - When you specify an array of dependencies (tag names), it means
       *    that the custom element will be observed for mutations in its
       *    shadow root until all its dependencies are defined.
       *
       *    This is least common case, as most custom elements know their
       *    dependencies. This case can happen if you let customize the
       *    internal render of your custom element with a property that
       *    redefines the render. This is the case for the Chameleon's
       *    `ch-chat`, the internal render of messages can be customized with
       *    the `renderItem` function, so we can avoid observing that custom
       *    element.
       *
       *    **IMPORTANT!!**: Try to avoid this case, as it can lead to
       *    performance issues, because the custom element will always be
       *    observed for DOM mutations.
       */
      dependencies?: CustomElementDependencies<tagName>;
    };
  };
};

/**
 * Mapping between the library's prefix and the options to define
 * the custom elements of that library.
 */
export type RegisteredLibraries<Prefix extends LibraryPrefix> = Map<
  Prefix,
  LibraryLoaderOptions<Prefix>
>;
