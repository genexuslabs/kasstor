import type { JSXBase } from "@stencil/core/internal";
// Empty import so the bare "@stencil/core" module is known to the augmentation
// below (augmenting a module requires it to be resolvable in the program).
import type {} from "@stencil/core";
import type { ComponentProperties } from "./components.js";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Types for StencilJS JSX templates
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace StencilJSX {
  export type KstTheme = Omit<JSXBase.HTMLAttributes<HTMLKstThemeElement>, keyof ComponentProperties.KstTheme> & Partial<ComponentProperties.KstTheme> & {
    /**
     * Emitted after all theme loading promises have completed. The event payload
     * contains a `success` array with the names of the themes that loaded
     * successfully and a `failed` array with the names of the themes that
     * failed (timed out or registry miss).
     * 
     * Bubbles: `true`. Composed: `false` — the event does not cross shadow DOM
     * boundaries.
     */
    onThemeLoaded?: (event: HTMLKstThemeElementThemeLoadedEvent) => void;
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

export type { StencilJSX };

declare module "@stencil/core" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends StencilJSX.IntrinsicElements {}
  }
}