// Types used by properties, events and methods
import type { ThemeModel } from "./components/theme/types.ts";

export type { ThemeModel };

// Component class types
import type { KstTheme as KstThemeElement } from "./components/theme/theme.lit.ts";

/**
 * Each interface contains the base class of the custom elements of the
 * library.
 */
export interface ComponentBaseClasses {
  "kst-theme": KstThemeElement;
}

/**
 * Each interface contains the properties of the custom elements of the library.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComponentProperties {
  export type KstTheme = Pick<KstThemeElement, "attachStyleSheetsDisabled" | "avoidFlashOfUnstyledContentDisabled" | "model">;
}

/**
 * Each interface contains the events of the custom elements of the library.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComponentEvents {
  export type KstTheme = {
    /**
     * Emitted after all theme loading promises have completed. The event payload
     * contains a `success` array with the names of the themes that loaded
     * successfully and a `failed` array with the names of the themes that
     * failed (timed out or registry miss).
     * 
     * Bubbles: `true`. Composed: `false` — the event does not cross shadow DOM
     * boundaries.
     */
    themeLoaded?: (event: HTMLKstThemeElementThemeLoadedEvent) => void;
  };
}

declare global {
  interface HTMLKstThemeElementCustomEvent<T> extends CustomEvent<T> {
    detail: T;
    target: HTMLKstThemeElement;
  }

  /** Type of the `kst-theme`'s `themeLoaded` event. */
  type HTMLKstThemeElementThemeLoadedEvent = HTMLKstThemeElementCustomEvent<
    HTMLKstThemeElementEventMap["themeLoaded"]
  >;

  interface HTMLKstThemeElementEventMap {
    themeLoaded: { success: string[]; failed: string[] };
  }

  interface HTMLKstThemeElementEventTypes {
    themeLoaded: HTMLKstThemeElementThemeLoadedEvent;
  }

  /**
   * The `kst-theme` component loads and manages named stylesheets that can be
   * shared and reused across the Document or any Shadow Root via the
   * `adoptedStyleSheets` API.
   *
   * @remarks
   * ## Features
   *  - Themes are specified by name and resolved from the global design-system
   *    registry (see `registerDesignSystem`).
   *  - Automatic attachment and detachment of stylesheets on connect/disconnect.
   *  - Built-in flash-of-unstyled-content (FOUC) prevention that hides the host
   *    until themes finish loading.
   *  - Toggle stylesheet attachment via the `attachStyleSheetsDisabled` property.
   *  - Attaches to the nearest `Document` or `ShadowRoot` via `adoptedStyleSheets`,
   *    enabling cross-component theme sharing.
   *
   * ## Use when
   *  - Applying shared design tokens or theme stylesheets across components.
   *  - Loading external CSS themes lazily at runtime (e.g., dark mode, brand
   *    themes, component skins).
   *  - Preventing flash of unstyled content before themes are applied.
   *
   * ## Do not use when
   *  - Styling a single component with scoped CSS — use the component's own
   *    `styles` instead.
   *  - Styles can be included as a static stylesheet link at build time — no
   *    runtime loading needed.
   *
   * @status experimental
   */
  interface HTMLKstThemeElement extends KstThemeElement {
    // Extend the KstTheme class redefining the event listener methods to improve type safety when using them
    addEventListener<K extends keyof HTMLKstThemeElementEventTypes>(type: K, listener: (this: HTMLKstThemeElement, ev: HTMLKstThemeElementEventTypes[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof HTMLKstThemeElementEventTypes>(type: K, listener: (this: HTMLKstThemeElement, ev: HTMLKstThemeElementEventTypes[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }

  interface IntrinsicElements {
    "kst-theme": HTMLKstThemeElement;
  }

  interface HTMLElementTagNameMap {
    "kst-theme": HTMLKstThemeElement;
  }
}