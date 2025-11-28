/**
 * Options for the Component decorator
 */
export type ComponentOptions<LibraryPrefix extends `${string}-`> = {
  globalStyles?: string;

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

