/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addGlobalStyleSheet,
  removeGlobalStyleSheet
} from "@genexus/kasstor-webkit/stylesheets.js";
import { LitElement, unsafeCSS, type PropertyValues } from "lit";

import { DEV_MODE, IS_SERVER } from "../../development-flags.js";
import { applySharedDesignSystemStylesForSSR } from "./apply-shared-design-system-styles-for-ssr.js";
import { componentWasServerSideRendered } from "./component-was-server-side-rendered.js";
import { getStylesheetsAndPromisesForSharedStyles } from "./get-styles-sheets-and-promises-for-shared-styles.js";
import { register, replaceConstructorWithProxy } from "./hmr-for-component.js";
import type { ComponentOptions } from "./types";
import { getDelayForUpdate } from "./update-scheduler.js";

// Re-export the types for simplify the imports for the end users
export type { ComponentOptions, ComponentShadowRootOptions } from "./types";

const DEFAULT_SHADOW_ROOT_MODE = "open" satisfies ShadowRootMode;
const DEFAULT_SHADOW_ROOT_DELEGATE_FOCUS = false satisfies ShadowRootInit["delegatesFocus"];

/**
 * Symbol used to store the metadata attached to the Kasstor component defined in the `@Component`
 * decorator.
 *
 * Not exported so it's not part of the public API.
 *
 * **Note**: It's still discoverable via
 * `Object.getOwnPropertySymbols(proto).find(s => s.description === "kasstor-metadata")`.
 */
const KASSTOR_METADATA_SYMBOL = Symbol("kasstor-component-metadata");

/**
 * Symbol used to store the global stylesheet attached to the Kasstor component defined in the `@Component`
 * decorator.
 *
 * Not exported so it's not part of the public API.
 *
 * **Note**: It's still discoverable via
 * `Object.getOwnPropertySymbols(proto).find(s => s.description === "kasstor-global-stylesheet")`.
 */
const KASSTOR_GLOBAL_STYLESHEET_SYMBOL = Symbol("kasstor-global-stylesheet");

const KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_NAMES_SYMBOL = Symbol(
  "kasstor-shared-design-system-stylesheet-names"
);
const KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEETS_SYMBOL = Symbol(
  "kasstor-shared-design-system-stylesheets"
);
const KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_PROMISES_SYMBOL = Symbol(
  "kasstor-shared-design-system-stylesheet-promises"
);

/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * @category Decorator
 * @param options Configuration options for the component
 *
 * @remarks
 * - The decorated class must extend {@link KasstorElement} (not `LitElement` directly).
 * - If `tag` is already defined by another constructor, the decorator does not
 *   redefine it and a console warning is emitted, except in two cases:
 *   - Under client-side HMR (the new class replaces the previous one via the
 *     HMR machinery wired up by `@genexus/vite-plugin-kasstor`).
 *   - During dev-time SSR (`DEV_MODE && IS_SERVER`), where the `@lit-labs/ssr`
 *     `CustomElementRegistry` is a process-wide singleton: the previous
 *     registration is evicted and the freshly-edited class is registered
 *     so subsequent SSR renders use the new template. See
 *     `docs/decorators.md → Dev-time SSR re-registration`.
 *
 * @example
 * ```ts
 * import styles from "./my-element.scss?inline";
 *
 * \@Component({
 *   tag: "my-element",
 *   styles
 * })
 * class MyElement extends KasstorElement {
 *   render() {
 *     return html`
 *     `;
 *   }
 * }
 * ```
 */
export const Component = <
  LibraryPrefix extends `${string}-`,
  Metadata,
  T extends typeof KasstorElement<Metadata>
>(
  options: ComponentOptions<LibraryPrefix, Metadata>
) =>
  function (target: T): T | void {
    const { globalStyles, tag, styles, shadow, sharedDesignSystemStyles } = options;
    const { prototype } = target;

    // Check if the element is already defined
    const existing = customElements.get(tag);

    if (DEV_MODE && !IS_SERVER && globalThis.kasstorCoreHmrEnabled) {
      register(tag, target as any);
    }

    if (existing && (existing as any) !== target) {
      // In dev mode with HMR, return the tag right away without prompting the
      // warning, because it was provoked by HMR
      if (
        DEV_MODE &&
        !IS_SERVER &&
        globalThis.kasstorCoreHmrEnabled &&
        globalThis.kasstorCoreHotModuleReplacedComponents?.has(tag)
      ) {
        return existing as any;
      }

      // Dev SSR fall-through: when Vite/Astro re-execute a component module
      // after a file edit, `@lit-labs/ssr`'s singleton `customElements`
      // registry still holds the OLD class. Evict the previous entry from
      // the dom-shim's internal map so the `customElements.define` call
      // below registers the freshly-edited class — otherwise the next SSR
      // render would emit stale HTML and the client would throw a
      // "Hydration value mismatch" from `@lit-labs/ssr-client`.
      const shimDefinitions =
        DEV_MODE && IS_SERVER
          ? (customElements as unknown as { __definitions?: Map<string, unknown> }).__definitions
          : undefined;

      if (shimDefinitions instanceof Map) {
        shimDefinitions.delete(tag);
        // Fall through to `customElements.define(tag, target)` below.
      } else {
        console.warn(
          `[@genexus/kasstor-core | Decorator Component] The tag name "${tag}" is already defined by the class "${existing.name}". The current tag won't be redefined by the class "${target.name}" and the "Component" decorator implementation will be ignored.
In some cases, this error can happen due to HMR (Hot Module Replacement) issues.`
        );

        return existing as any;
      }
    }

    // Modify the class without creating a new one
    if (shadow === false) {
      // Override createRenderRoot to not render a ShadowRoot
      (prototype as any).createRenderRoot = function () {
        return this;
      };
    }
    // Set static properties for Shadow DOM
    else {
      const { delegatesFocus, formAssociated, mode } = shadow ?? {};

      if (formAssociated === true) {
        (target as any).formAssociated = true;
      }

      target.shadowRootOptions = {
        delegatesFocus: delegatesFocus ?? DEFAULT_SHADOW_ROOT_DELEGATE_FOCUS,
        mode: mode ?? DEFAULT_SHADOW_ROOT_MODE
      };

      if (styles) {
        target.styles = unsafeCSS(styles);
      }
    }

    // Don't try to fetch the shared design system stylesheets in the server side,
    // because the stylesheets are not available and we render them as a html
    // link tag in the component template.
    //
    // The CSR processing must run regardless of `shadow`: for shadow DOM
    // components the sheets are pushed onto `renderRoot.adoptedStyleSheets`,
    // for light DOM components they are routed through `addGlobalStyleSheet`
    // onto the host's root node — both paths are driven from
    // `#waitAndAdoptSharedStyleSheets`, which reads these prototype slots.
    if (!IS_SERVER && sharedDesignSystemStyles) {
      const { successfulThemes, promises } =
        getStylesheetsAndPromisesForSharedStyles(sharedDesignSystemStyles);

      prototype[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEETS_SYMBOL] = successfulThemes;

      if (promises.length > 0) {
        prototype[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_PROMISES_SYMBOL] = new Promise(resolve =>
          Promise.all(promises).then(cssStyleSheets => {
            for (let i = 0; i < cssStyleSheets.length; i++) {
              const styleSheet = cssStyleSheets[i];

              if (styleSheet) {
                successfulThemes.push(styleSheet);
              }
            }

            // TODO: Add a test to validate this case.
            // Clear the reference for component that will be rendered in the future, so we
            // don't delay the rendering by a microtask.
            prototype[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_PROMISES_SYMBOL] = undefined;

            resolve();
          })
        );
      }
    }

    if (DEV_MODE) {
      const hasGlobalStylesWhenNotUsingShadow = shadow === false && !!globalStyles;

      if (hasGlobalStylesWhenNotUsingShadow) {
        console.warn(
          `[@genexus/kasstor-core | Decorator Component] You can safely use normal styles instead of globalStyles in the @Component decorator for the "${tag}" element, because the element doesn't have Shadow DOM.`
        );
      }
    }

    let stylesToAttach: string | undefined = globalStyles;

    // Merge component's styles into globalStyles when Shadow DOM = false
    if (shadow === false && styles) {
      stylesToAttach = stylesToAttach ? styles + " " + stylesToAttach : styles;
    }

    // Add global styles
    if (!IS_SERVER && stylesToAttach) {
      const stylesheet = new CSSStyleSheet();
      stylesheet.replaceSync(stylesToAttach);
      prototype[KASSTOR_GLOBAL_STYLESHEET_SYMBOL] = stylesheet;
    }

    prototype[KASSTOR_METADATA_SYMBOL] = options.metadata;
    prototype[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_NAMES_SYMBOL] = sharedDesignSystemStyles;

    // We won't implement the define method of the custom elements protocol,
    // since at the time of creating the Component decorator, there are not
    // good integrations with the protocol (for example, SSR in Astro fails to
    // work with the "define" method) and we won't need this protocol if we
    // don't re-export the customElements in a index.ts (which is the main
    // issue as this provokes a side-effect that defines the components)
    customElements.define(tag, target as any);

    // Return the modified class with the define method
    return target;
  };

/**
 * Base class for Kasstor components that extends the LitElement. This class
 * provides extra utilities as follows:
 *   - Better support for SSR in the components.
 *
 *   - Support for styling components with SCSS/SASS.
 *
 *   - Support for styling components without Shadow DOM.
 *
 *   - Adds the `firstWillUpdate` life cycle method which works with SSR.
 *
 *   - Adds support for the `Observe` decorator.
 *
 *   - Support to define global styles outside of the component that work with
 *     and without Shadow DOM.
 *
 *   - Support for HMR by using the `@genexus/vite-plugin-kasstor` package.
 *
 *   - Improved initial rendering performance by reducing the Total Blocking
 *     Time (TBT) in scenarios where many components are initially rendered.
 *
 * @example
 * ```ts
 * import { Component, KasstorElement } from "@genexus/kasstor-core/decorators/component.js";
 * import styles from "./my-element.scss?inline"; // Only available with Vite
 *
 * \@Component({
 *   tag: "my-element",
 *   styles
 * })
 * export class MyElement extends KasstorElement {
 *   // Component implementation
 * }
 * ```
 */
export abstract class KasstorElement<Metadata = unknown> extends LitElement {
  #serverSideRendered: boolean;
  #sharedStylesWereAdopted: boolean = false;

  protected [KASSTOR_GLOBAL_STYLESHEET_SYMBOL]: CSSStyleSheet | undefined;
  protected [KASSTOR_METADATA_SYMBOL]: Metadata | undefined;

  /**
   * Shared asynchronous styles that are loaded from the design system registry
   * and adopted into the component's shadow root or the root node of the
   * component if it doesn't have a shadow root.
   */
  protected [KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_NAMES_SYMBOL]: string[] | undefined;

  protected [KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEETS_SYMBOL]: CSSStyleSheet[] | undefined;

  /**
   * Promises for the shared design system stylesheets.
   */
  protected [KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_PROMISES_SYMBOL]: Promise<void> | undefined;

  constructor() {
    super();
    // TODO: There is a bug with this computation. In Astro when the polyfill
    // for SSRed is applied, in the connectedCallback the shadowRoot is empty, so
    // this computation fails, but in the first willUpdate (before the first
    // render), this computation is correct. We need to find a way to
    // communicate this information correctly.
    this.#serverSideRendered = componentWasServerSideRendered(this);

    const willUpdateOriginalImplementation = this.willUpdate;

    // Implement the beforeFirstUpdate hook by monkey-patching the willUpdate
    // method of the LitElement
    this.willUpdate = function (changedProperties: PropertyValues) {
      /**
       * A reserved callback to implement the Watch decorator.
       *
       * This callback is defined when there is a Watch decorator applied to the
       * component.
       *
       * When defined, it will be called before the `willUpdate` life cycle method.
       * It will also be called before the `firstWillUpdate` life cycle method.
       */
      // TODO: Find a better way of doing this without proving a waterfall in the
      // initial load, by using an external symbol that is referenced here and in
      // the KasstorElement
      (this as any).kasstorObserveCallback?.(changedProperties);

      if (!this.hasUpdated) {
        this.firstWillUpdate(changedProperties);
      }

      // Call the original implementation
      willUpdateOriginalImplementation.call(this, changedProperties);
    };

    // If there are shared design system styles, we inline them as a link when the component is SSRed
    if (this.#serverSideRendered) {
      applySharedDesignSystemStylesForSSR(
        this,
        this[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_NAMES_SYMBOL]
      );
    }

    // TODO: Add an additional flag for checking when the vite server is on
    // HMR support for dev mode only
    if (DEV_MODE && !IS_SERVER && globalThis.kasstorCoreHmrEnabled) {
      replaceConstructorWithProxy(this);
    }
  }

  /**
   * Waits for the shared style sheets to be loaded and adopts them into the
   * component's shadow root or the root node of the component if it doesn't
   * have a shadow root.
   */
  #waitAndAdoptSharedStyleSheets = (): Promise<void> | undefined => {
    if (this.#sharedStylesWereAdopted || this.#serverSideRendered) {
      return;
    }
    const promiseToLoadStyleSheets = this[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEET_PROMISES_SYMBOL];

    if (promiseToLoadStyleSheets === undefined) {
      this.#adoptSharedStyleSheets();
      return;
    }
    return promiseToLoadStyleSheets.then(this.#adoptSharedStyleSheets);
  };

  #adoptSharedStyleSheets = () => {
    const stylesheets = this[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEETS_SYMBOL];

    if (stylesheets === undefined) {
      return undefined;
    }

    if (this.renderRoot instanceof ShadowRoot) {
      this.renderRoot.adoptedStyleSheets.push(...stylesheets);
      this.#sharedStylesWereAdopted = true;
      return;
    }

    // If the component is not connected to the DOM, we can't adopt the global,
    // stylesheets, as the root node is not available. We do this early return
    // to avoid marking the stylesheets as adopted prematurely.
    if (!this.isConnected) {
      return;
    }
    stylesheets.forEach(stylesheet => addGlobalStyleSheet(this, stylesheet));
    this.#sharedStylesWereAdopted = true;
  };

  #removeSharedStyleSheets = () => {
    if (this.#sharedStylesWereAdopted && !(this.renderRoot instanceof ShadowRoot)) {
      this[KASSTOR_SHARED_DESIGN_SYSTEM_STYLESHEETS_SYMBOL]?.forEach(stylesheet =>
        removeGlobalStyleSheet(this, stylesheet)
      );
      this.#sharedStylesWereAdopted = false;
    }
  };

  /**
   * `true` if the component was server side rendered.
   */
  protected get wasServerSideRendered(): boolean {
    return this.#serverSideRendered;
  }

  protected set wasServerSideRendered(value: boolean) {
    this.#serverSideRendered = value;
  }

  /**
   * Metadata attached to the component defined in the `@Component` decorator.
   */
  protected get kstMetadata(): Metadata | undefined {
    return this[KASSTOR_METADATA_SYMBOL];
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (this[KASSTOR_GLOBAL_STYLESHEET_SYMBOL]) {
      addGlobalStyleSheet(this, this[KASSTOR_GLOBAL_STYLESHEET_SYMBOL]);
    }

    // If the component has been moved and it doesn't have a shadow root, we
    // need to re-attach the shared style sheets in the new root node, as the
    // disconnectedCallback method was previously called and the stylesheets were removed.
    if (this.hasUpdated) {
      this.#waitAndAdoptSharedStyleSheets();
    }

    // Register instance globally for dev-time tooling (HMR, style replacement)
    // Only in dev mode
    if (DEV_MODE) {
      const tagName = (this.constructor as any).is || this.tagName.toLowerCase();
      globalThis.kasstorCoreRegisteredInstances ??= new Map();

      const { kasstorCoreRegisteredInstances } = globalThis;
      if (!kasstorCoreRegisteredInstances.has(tagName)) {
        kasstorCoreRegisteredInstances.set(tagName, new Set());
      }
      kasstorCoreRegisteredInstances.get(tagName)!.add(this);
    }
  }

  // Throttle updates when there are too many at the same time. This mechanism
  // is based on the event loop and the ideas of https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-customizing
  /**
   * Schedules an element update. You can override this method to change the
   * timing of updates by returning a Promise. The update will await the
   * returned Promise, and you should resolve the Promise to allow the update
   * to proceed. If this method is overridden, `await super.scheduleUpdate()`
   * must be called.
   *
   * For instance, to schedule updates to occur just before the next frame:
   * ```ts
   * override protected async scheduleUpdate(): Promise<void> {
   *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
   *   await super.scheduleUpdate();
   * }
   * ```
   *
   * In general, you shouldn't need to override this method, as the
   * `KasstorElement` class already performs optimizations when
   * rendering/updating a large number of components at the same time to reduce
   * the Total Blocking Time (TBT).
   *
   * @category — updates
   */
  protected override async scheduleUpdate(): Promise<void> {
    const delayForUpdate = getDelayForUpdate(this.hasUpdated);

    if (delayForUpdate !== undefined) {
      await delayForUpdate;
    }

    // At this point, since the connectedCallback method has been called, we can
    // assume that the component has been rendered and is attached to the DOM.
    if (!this.hasUpdated) {
      const mustWaitForPromiseResolution = this.#waitAndAdoptSharedStyleSheets();

      if (mustWaitForPromiseResolution !== undefined) {
        await mustWaitForPromiseResolution;
      }
    }

    // Render the element, as super.update ends up calling render()
    super.scheduleUpdate();
  }

  /**
   * Invoked before the first `willUpdate` of the component. Subsequent renders
   * will not call this method, as it under the hood uses the `this.hasUpdated`
   * property.
   *
   * Implement `firstWillUpdate` to compute property values that depend on
   * other properties and are used as initial values in the first render.
   *
   * This method is especially useful when the component was server side
   * rendered, because Lit doesn't properly initialize the properties in the
   * `connectedCallback` phase when SSR is detected, but it does it just before
   * the first update (for example, in the `willUpdate` phase).
   *
   * Some notes about this method:
   *  - Works on the server and the client.
   *
   *  - Setting properties inside this method will not trigger another update.
   *
   *  - Even if the element is moved in the DOM, this method won't be called
   *    again if it was already called once (but the `connectedCallback` will
   *    be called again).
   *
   * ```ts
   * protected override firstWillUpdate() {
   *   // Initialization work...
   * }
   * ```
   *
   * @param changedProperties Map of changed properties with old values
   * @category updates
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected firstWillUpdate(_changedProperties: PropertyValues): void {}

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this[KASSTOR_GLOBAL_STYLESHEET_SYMBOL]) {
      removeGlobalStyleSheet(this, this[KASSTOR_GLOBAL_STYLESHEET_SYMBOL]);
    }

    this.#removeSharedStyleSheets();

    // Unregister instance globally for dev-time tooling (HMR, style replacement)
    // Only in dev mode
    if (DEV_MODE) {
      const tagName = (this.constructor as any).is || this.tagName.toLowerCase();

      globalThis.kasstorCoreRegisteredInstances!.get(tagName)!.delete(this);
    }
  }
}
