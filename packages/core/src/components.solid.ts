import type { JSX } from "solid-js";
import type { ThemeModel } from "./components.js";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Types for SolidJS JSX templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Each interface contains the properties of the custom elements of the library.
 * This format is used for SolidJS applications.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ComponentPropertiesSolidJS {
  export type KstTheme = {
    /**
     * Indicates whether the theme should be attached to the Document or the
     * ShadowRoot after loading.
     * 
     * The value can be overridden by the `attachStyleSheet` property of each
     * individual item in the model. When toggled at runtime, already-loaded
     * themes are attached or detached accordingly without re-fetching.
     */
    "prop:attachStyleSheetsDisabled"?:  boolean;

    /**
     * `true` to disable hiding the contents of the root node while the
     * stylesheets are being loaded. When disabled (default), a `<style>`
     * element with `visibility: hidden !important` is rendered into the host
     * until all themes resolve. Set to `true` if the initial unstyled flash is
     * acceptable or if the themes are expected to be cached.
     */
    "prop:avoidFlashOfUnstyledContentDisabled"?:  boolean;

    /**
     * Specifies the themes to load. Accepts a single theme name (string), an
     * array of theme names, a single `ThemeItemModel` object, or an array of
     * `ThemeItemModel` objects. Each item may specify a `name` and an optional
     * `attachStyleSheet` override.
     * 
     * Theme names are resolved against the global registry created with
     * `registerDesignSystem`; an unknown name will eventually time out.
     * 
     * When set to `undefined` or `null`, no themes are loaded.
     * 
     * **Note:** The model is only processed on the first non-null assignment.
     * Subsequent changes to an already-loaded model are currently not reactive.
     */
    "prop:model"?:  ThemeModel | undefined | null;
  };
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace SolidJsJSX {
  export type KstTheme = Omit<JSX.HTMLAttributes<HTMLKstThemeElement>, keyof ComponentPropertiesSolidJS.KstTheme> & ComponentPropertiesSolidJS.KstTheme & {
    /**
     * Emitted after all theme loading promises have completed. The event payload
     * contains a `success` array with the names of the themes that loaded
     * successfully and a `failed` array with the names of the themes that
     * failed (timed out or registry miss).
     * 
     * Bubbles: `true`. Composed: `false` — the event does not cross shadow DOM
     * boundaries.
     */
    "on:themeLoaded"?: (event: HTMLKstThemeElementThemeLoadedEvent) => void;
  };
  
  interface IntrinsicElements {
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
    "kst-theme": KstTheme;
  }
}

export type { SolidJsJSX };

declare module "solid-js" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends SolidJsJSX.IntrinsicElements {}
  }
}