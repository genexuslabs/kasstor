import { getLoadedStyleSheet } from "@genexus/kasstor-design-system/get-loaded-style-sheet.js";
import {
  addGlobalStyleSheet,
  removeGlobalStyleSheet
} from "@genexus/kasstor-webkit/stylesheets.js";
import { property } from "lit/decorators/property.js";
import { state } from "lit/decorators/state.js";
import { html, nothing } from "lit/html.js";

import { Component, KasstorElement } from "../../decorators/Component/index.js";
import { Event, type EventEmitter } from "../../decorators/Event/index.js";
import { Observe } from "../../decorators/Observe/index.js";
import { canAttachStyleSheet } from "./internal/can-attach-stylesheet";
import { loadThemes } from "./internal/load-themes";
import { normalizeModel } from "./internal/normalize-model";
import type { ThemeModel } from "./types";

import styles from "./theme.scss?inline";

const LOADING_ATTRIBUTE = "data-kst-theme-loading";

const STYLE_TO_AVOID_FOUC = `:host,:has(>kst-theme[${LOADING_ATTRIBUTE}]){visibility:hidden !important}`;

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
@Component({
  tag: "kst-theme",
  shadow: false,
  styles
})
export class KstTheme extends KasstorElement {
  /**
   * `true` once every theme in `model` has finished loading (successfully or
   * not). Used internally to decide whether the FOUC style should be rendered
   * and to suppress re-processing of the model.
   */
  @state() loaded: boolean = false;

  /**
   * Indicates whether the theme should be attached to the Document or the
   * ShadowRoot after loading.
   *
   * The value can be overridden by the `attachStyleSheet` property of each
   * individual item in the model. When toggled at runtime, already-loaded
   * themes are attached or detached accordingly without re-fetching.
   */
  @property({ attribute: "attach-style-sheets-disabled", type: Boolean })
  attachStyleSheetsDisabled: boolean = false;
  @Observe("attachStyleSheetsDisabled")
  protected attachStyleSheetsChanged() {
    if (this.loaded) {
      this.#toggleAttachedStyleSheets();
    }
  }

  /**
   * `true` to disable hiding the contents of the root node while the
   * stylesheets are being loaded. When disabled (default), a `<style>`
   * element with `visibility: hidden !important` is rendered into the host
   * until all themes resolve. Set to `true` if the initial unstyled flash is
   * acceptable or if the themes are expected to be cached.
   */
  @property({ attribute: "avoid-flash-of-unstyled-content-disabled", type: Boolean })
  avoidFlashOfUnstyledContentDisabled: boolean = false;

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
  @property() model: ThemeModel | undefined | null;
  @Observe("model")
  protected modelChanged() {
    this.#loadModel();
  }

  /**
   * Emitted after all theme loading promises have completed. The event payload
   * contains a `success` array with the names of the themes that loaded
   * successfully and a `failed` array with the names of the themes that
   * failed (timed out or registry miss).
   *
   * Bubbles: `true`. Composed: `false` — the event does not cross shadow DOM
   * boundaries.
   */
  @Event({ bubbles: true, composed: false })
  protected themeLoaded!: EventEmitter<{ success: string[]; failed: string[] }>;

  override connectedCallback() {
    super.connectedCallback();
    this.#toggleLoadingAttribute();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#toggleAttachedStyleSheets();
  }

  #loadModel = () => {
    if (this.loaded) {
      return;
    }

    const actualModel = normalizeModel(this.model);

    if (actualModel.length === 0) {
      return;
    }
    const { successfulThemes, promises } = loadThemes(actualModel, this);

    if (promises.length > 0) {
      this.#toggleLoadingAttribute();

      // Wait for all themes to load. Don't need to use Promise.allSettled
      // because all themes will "resolve" with a styleSheet or undefined. If
      // a theme fails to load, it will resolve with undefined.
      Promise.all(promises).then(results => {
        const failedThemes: string[] = [];

        // For let i ... is the faster way to iterate over an array in JavaScript
        for (let i = 0; i < results.length; i++) {
          const result = results[i];

          if (result.styleSheet === undefined) {
            failedThemes.push(result.name);
          } else {
            successfulThemes.push(result.name);
          }
        }

        this.#markThemesAsLoaded(successfulThemes, failedThemes);
      });
    } else {
      this.#markThemesAsLoaded(successfulThemes, []);
    }
  };

  #markThemesAsLoaded = (success: string[], failed: string[]) => {
    this.loaded = true;
    this.#toggleLoadingAttribute();
    this.themeLoaded.emit({ success, failed });
  };

  #toggleLoadingAttribute = () => {
    if (this.loaded) {
      this.removeAttribute(LOADING_ATTRIBUTE);
    } else {
      this.setAttribute(LOADING_ATTRIBUTE, "");
    }
  };

  #toggleAttachedStyleSheets = () => {
    const actualModel = normalizeModel(this.model);
    const modelLength = actualModel.length;

    // For let i ... is the faster way to iterate over an array in JavaScript
    for (let i = 0; i < modelLength; i++) {
      const themeItem = actualModel[i];
      const loadedCssStyleSheet = getLoadedStyleSheet(themeItem.name);

      if (canAttachStyleSheet(themeItem.attachStyleSheet, loadedCssStyleSheet, this)) {
        addGlobalStyleSheet(this, loadedCssStyleSheet!);
      } else if (loadedCssStyleSheet) {
        removeGlobalStyleSheet(this, loadedCssStyleSheet);
      }
    }
  };

  override render() {
    return this.avoidFlashOfUnstyledContentDisabled || this.loaded
      ? nothing
      : html`<style>
          ${STYLE_TO_AVOID_FOUC}
        </style>`;
  }
}

// ######### Auto generated below #########

declare global {
  // prettier-ignore
  interface HTMLKstThemeElementCustomEvent<T> extends CustomEvent<T> {
    detail: T;
    target: HTMLKstThemeElement;
  }

  /** Type of the `kst-theme`'s `themeLoaded` event. */
  // prettier-ignore
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
   *
   * @fires themeLoaded Emitted after all theme loading promises have completed. The event payload
   *   contains a `success` array with the names of the themes that loaded
   *   successfully and a `failed` array with the names of the themes that
   *   failed (timed out or registry miss).
   *   
   *   Bubbles: `true`. Composed: `false` — the event does not cross shadow DOM
   *   boundaries.
   */
  // prettier-ignore
  interface HTMLKstThemeElement extends KstTheme {
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

