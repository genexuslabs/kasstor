/**
 * Valid bundle names accepted by {@link ComponentOptions.sharedDesignSystemStyles}.
 *
 * Derived from the global {@link KasstorSharedDesignSystemStyles} registry: while
 * that interface is empty (the default), this falls back to `string` so the
 * option keeps its lenient `string[]` shape and nothing breaks. As soon as the
 * consuming application augments the registry (see its JSDoc in
 * `typings/global.ts`), this becomes the union of the registered keys, so every
 * `@Component` is type-checked against the allow-list and a typo fails.
 */
export type SharedDesignSystemStyleName = keyof KasstorSharedDesignSystemStyles extends never
  ? string
  : keyof KasstorSharedDesignSystemStyles;

/**
 * Options for the Component decorator.
 */
export type ComponentOptions<LibraryPrefix extends `${string}-`, Metadata> = {
  /**
   * CSS string applied as a global stylesheet when the component is connected.
   * Works with and without Shadow DOM. When `shadow: false`, consider using
   * `styles` instead; the decorator may merge them for you.
   */
  globalStyles?: string;

  /**
   * Optional metadata attached to the component (e.g. for extending the component).
   * Available on instances as `this.kstMetadata`.
   */
  metadata?: Metadata;

  /**
   * Custom element tag name (e.g. `"my-button"`). Must include a hyphen and
   * match the library prefix. If this tag is already defined, the decorator
   * will not redefine it and a warning is logged (unless under HMR).
   */
  tag: `${LibraryPrefix}${string}`;

  /**
   * Specifies a set of options to customize the shadow root of the custom
   * element.
   *
   * By default, it assumes that the component uses Shadow DOM, so you only
   * need to provide the options for customizing the shadow root behavior.
   * If not specified, the following set of options are assumed:
   *   - `delegatesFocus: false`
   *   - `formAssociated: false`
   *   - `mode: "open"`
   *
   * If you don't want to use Shadow DOM, you can set this property to `false`.
   * We don't recommend using shadow: false, because slots (composition in
   * general) only exists when using shadow DOM, as well as style a JavaScript
   * encapsulation.
   */
  shadow?: ComponentShadowRootOptions | false;

  /**
   * Shared asynchronous styles that are loaded from the design system registry
   * and adopted into the component's shadow root or the root node of the
   * component if it doesn't have a shadow root.
   *
   * Each entry is a bundle name previously registered with `registerDesignSystem`
   * (from `@genexus/kasstor-design-system`). The accepted names default to any
   * `string`, but can be globally constrained to a typed allow-list by augmenting
   * the {@link KasstorSharedDesignSystemStyles} registry — see
   * {@link SharedDesignSystemStyleName}.
   */
  sharedDesignSystemStyles?: SharedDesignSystemStyleName[];

  styles?: string;
};

export type ComponentShadowRootOptions = {
  /**
   * If `true`, when a non-focusable part of the shadow DOM is clicked, or
   * `.focus()` is called on the host element, the first focusable part inside
   * the host's shadow DOM is given focus, and the shadow host is given any
   * available `:focus` styling.
   *
   * If not specified, it uses `false` by default.
   */
  delegatesFocus?: boolean;

  /**
   * If `true`, it makes the [autonomous custom element](https://html.spec.whatwg.org/dev/custom-elements.html#autonomous-custom-element)
   * a [form-associated custom element](https://html.spec.whatwg.org/dev/custom-elements.html#form-associated-custom-element),
   * which is necessary when implementing custom elements that uses
   * [ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals)
   * to work on forms.
   *
   * If not specified, it uses `false` by default.
   */
  formAssociated?: boolean;

  /**
   * This defines whether or not the shadow root's internal features are
   * accessible from JavaScript.
   *
   * If not specified, it uses `"open"` by default.
   */
  mode?: ShadowRootMode;
};
