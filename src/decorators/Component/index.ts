/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, unsafeCSS } from "lit";

import { DEV_MODE, IS_SERVER } from "../../development-flags";
import { removeIndex } from "../../other/array";
import type { ComponentOptions } from "./types";

// Re-export the types for simplify the imports for the end users
export type { ComponentOptions, ComponentShadowRootOptions } from "./types";

const rootNodes = new WeakMap<HTMLElement, Document | ShadowRoot>();

const DEFAULT_SHADOW_ROOT_MODE = "open" satisfies ShadowRootMode;
const DEFAULT_SHADOW_ROOT_DELEGATE_FOCUS =
  false satisfies ShadowRootInit["delegatesFocus"];

/**
 * Given a key it returns a WeakMap for the global StyleSheet that the key has.
 * Each StyleSheet contains the number of elements that reference that
 * StyleSheet in the key.
 *
 * The number of reference is particular useful for not removing the StyleSheet
 * in the key (Document | ShadowRoot) until there is no element that needs to
 * reference that StyleSheet.
 */
const globalStyles = new WeakMap<
  Document | ShadowRoot,
  WeakMap<CSSStyleSheet, number>
>();

const addGlobalStyleSheet = (
  element: HTMLElement,
  stylesheet: CSSStyleSheet
) => {
  const rootNode = element.getRootNode();

  if (rootNode instanceof ShadowRoot || rootNode instanceof Document) {
    // Store the root node of the element to later remove the stylesheet when
    // the element is disconnected from the DOM. We have to store the root node,
    // because when disconnectedCallback is called the getRootNode method does
    // not return the actual rootNode of the element (it returns a reference to
    // the element itself).
    rootNodes.set(element, rootNode);

    // Ensure the rootNode has a WeakMap for storing its global StyleSheet
    if (!globalStyles.has(rootNode)) {
      globalStyles.set(rootNode, new WeakMap());
    }

    const rootNodeGlobalStyles = globalStyles.get(rootNode)!;
    const rootNodeStyleSheetReferences =
      rootNodeGlobalStyles.get(stylesheet) ?? 0;

    // Set the StyleSheet references
    if (rootNodeStyleSheetReferences === 0) {
      rootNode.adoptedStyleSheets.push(stylesheet);
    }

    // Increase the StyleSheet references
    rootNodeGlobalStyles.set(stylesheet, rootNodeStyleSheetReferences + 1);
  }
};

const removeGlobalStyleSheet = (
  element: HTMLElement,
  stylesheet: CSSStyleSheet
) => {
  const rootNode = rootNodes.get(element);

  // We don't know if this case it's possible. Maybe if the rootNode is
  // disconnected and at the same time the memory is recycled before calling
  // this function.Another case could be the element was disconnected before
  // calling connectedCallback?
  if (!rootNode) {
    return;
  }

  const rootNodeGlobalStyles = globalStyles.get(rootNode);

  // Same reasoning as before for this check
  if (!rootNodeGlobalStyles) {
    return;
  }

  const rootNodeStyleSheetReferences = rootNodeGlobalStyles.get(stylesheet);

  // Nothing to do, the StyleSheet mapping doesn't exists
  if (rootNodeStyleSheetReferences === undefined) {
    return;
  }

  // This is the only element that refers this stylesheet, we must remove it
  const mustRemoveStyleSheet = rootNodeStyleSheetReferences === 1;

  if (mustRemoveStyleSheet) {
    // Try to find the StyleSheet in the rootNode
    const styleSheetIndex = rootNode.adoptedStyleSheets.findIndex(
      rootNodeStyleSheet => rootNodeStyleSheet === stylesheet
    );

    if (styleSheetIndex !== -1) {
      removeIndex(rootNode.adoptedStyleSheets, styleSheetIndex);
    }

    // Delete the reference in the WeakMap, so new elements must add again this
    // StyleSheet
    rootNodeGlobalStyles.delete(stylesheet);
  }
  // There are more elements that refers this StyleSheet, we must only decrease
  // the reference count
  else {
    rootNodeGlobalStyles.set(stylesheet, rootNodeStyleSheetReferences - 1);
  }
};

/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * @category Decorator
 * @param options Configuration options for the component
 *
 * @example
 * ```ts
 * import styles from "./my-element.scss?inline";
 *
 * \@Component({
 *   tag: "my-element",
 *   styles
 * })
 * class MyElement extends SSRLitElement {
 *   render() {
 *     return html`
 *     `;
 *   }
 * }
 * ```
 */
export const Component = <
  LibraryPrefix extends `${string}-`,
  T extends typeof SSRLitElement
>(
  options: ComponentOptions<LibraryPrefix>
) =>
  function (target: T): T | void {
    const {
      deferInitialRender,
      deferUpdate,
      globalStyles,
      tag,
      styles,
      shadow
    } = options;
    const { prototype } = target;

    // Check if the element is already defined
    const existing = customElements.get(tag);

    if (existing && (existing as any) !== target) {
      console.warn(
        `The tag name "${tag}" is already defined by the class "${existing.name}". The current tag won't be redefined by the class "${target.name}" and the "Component" decorator implementation will be ignored.
In some cases, this error can happen due to HMR (Hot Module Replacement) issues.`
      );

      return existing as any;
    }

    // Store in the SSRLitElement class these values
    (prototype as any).deferInitialRender = deferInitialRender;
    (prototype as any).deferUpdate = deferUpdate;

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
      const hasGlobalStylesWhenNotUsingShadow =
        shadow === false && !!globalStyles;

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
 * Implements a basic check to decide if the component was server side rendered.
 *
 * This function must be used before the first render!
 */
const componentWasServerSideRendered = (element: LitElement) =>
  IS_SERVER ||
  (!!element.shadowRoot && element.shadowRoot.children.length !== 0);

/**
 * Base class for Chameleon components that extends the LitElement. This class
 * provides extra utilities to support SSR in the components.
 */
export abstract class SSRLitElement extends LitElement {
  #serverSideRendered: boolean;

  /**
   * Defer the initial rendering of the component until the end of the next
   * frame.
   *
   * This technique can be used to unblock the main rendering/event thread,
   * which can improve page rendering performance.
   *
   * For example, if you render this component 2000 times simultaneously, you
   * might want to use this property to reduce the Total Blocking Time (TBT),
   * which would improve your Lighthouse performance score.
   *
   * This option is based on [overriding the `scheduleUpdate()` to customize the
   * timing of the update](https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-customizing).
   */
  protected deferInitialRender: boolean | undefined;

  /**
   * Same as the `deferInitialRender` option, but works on all updates, not
   * just the initial render.
   */
  protected deferUpdate: boolean | undefined;

  protected globalStyles: CSSStyleSheet | undefined;

  constructor() {
    super();
    // TODO: There is a bug with this computation. In Astro when the polyfill
    // for SSRed is applied, in the connectedCallback the shadowRoot is empty, so
    // this computation fails, but in the first willUpdate (before the first
    // render), this computation is correct. We need to find a way to
    // communicate this information correctly.
    this.#serverSideRendered = componentWasServerSideRendered(this);
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

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.globalStyles) {
      addGlobalStyleSheet(this, this.globalStyles);
    }
  }

  protected override async scheduleUpdate(): Promise<void> {
    if ((this.deferInitialRender && !this.hasUpdated) || this.deferUpdate) {
      await new Promise(resolve => setTimeout(resolve));
    }

    super.scheduleUpdate();
  }

  override disconnectedCallback(): void {
    if (this.globalStyles) {
      removeGlobalStyleSheet(this, this.globalStyles);
    }
    super.disconnectedCallback();
  }
}

