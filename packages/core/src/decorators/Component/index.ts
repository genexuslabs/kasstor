/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addGlobalStyleSheet,
  removeGlobalStyleSheet
} from "@genexus/kasstor-webkit/global-stylesheets.js";
import { LitElement, unsafeCSS, type PropertyValues } from "lit";

import { DEV_MODE, IS_SERVER } from "../../development-flags.js";
import { componentWasServerSideRendered } from "./component-was-server-side-rendered.js";
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
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * @category Decorator
 * @param options Configuration options for the component
 *
 * @remarks
 * - The decorated class must extend {@link KasstorElement} (not `LitElement` directly).
 * - If `tag` is already defined by another constructor, the decorator does not
 *   redefine it and a console warning is emitted (except when HMR has replaced the component).
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
    const { globalStyles, tag, styles, shadow } = options;
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

      console.warn(
        `The tag name "${tag}" is already defined by the class "${existing.name}". The current tag won't be redefined by the class "${target.name}" and the "Component" decorator implementation will be ignored.
In some cases, this error can happen due to HMR (Hot Module Replacement) issues.`
      );

      return existing as any;
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

    if (DEV_MODE) {
      const hasGlobalStylesWhenNotUsingShadow = shadow === false && !!globalStyles;

      if (hasGlobalStylesWhenNotUsingShadow) {
        console.warn(
          `You can safely use normal styles instead of globalStyles in the @Component decorator for the "${tag}" element, because the element doesn't have Shadow DOM.`
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
      (prototype as any).globalStyles = stylesheet;
    }

    prototype[KASSTOR_METADATA_SYMBOL] = options.metadata;

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

  protected globalStyles: CSSStyleSheet | undefined;
  [KASSTOR_METADATA_SYMBOL]: Metadata | undefined;

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

    // TODO: Add an additional flag for checking when the vite server is on
    // HMR support for dev mode only
    if (DEV_MODE && !IS_SERVER && globalThis.kasstorCoreHmrEnabled) {
      replaceConstructorWithProxy(this);
    }
  }

  /**
   * `true` is the component was rendered in the server
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

    if (this.globalStyles) {
      addGlobalStyleSheet(this, this.globalStyles);
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

    if (this.globalStyles) {
      removeGlobalStyleSheet(this, this.globalStyles);
    }

    // Unregister instance globally for dev-time tooling (HMR, style replacement)
    // Only in dev mode
    if (DEV_MODE) {
      const tagName = (this.constructor as any).is || this.tagName.toLowerCase();

      globalThis.kasstorCoreRegisteredInstances!.get(tagName)!.delete(this);
    }
  }
}

