import {
  directive,
  Directive,
  PartType,
  type PartInfo
} from "lit/directive.js";
import { nothing, type ElementPart } from "lit/html.js";
import { loadComponent } from "../../bootstrapping/load-component.js";
import type { CustomElementTagNames } from "../../bootstrapping/typings/non-standard-elements.js";

class LazyLoadDirective extends Directive {
  #elementPart?: Element;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error(
        "[@genexus/kasstor-core]: `lazyLoad()` can only be used in a ElementPart. For example:\n<my-element ${lazyLoad()}></my-element>"
      );
    }
  }

  override update(part: ElementPart) {
    const elementChanged =
      this.#elementPart === undefined ||
      // Don't apply toLowerCase() in this stage to improve the if performance
      this.#elementPart.tagName !== part.element.tagName;

    // Try to dynamic load the component
    if (elementChanged) {
      this.#elementPart = part.element;

      const tagName = this.#elementPart.tagName.toLowerCase();
      loadComponent(tagName as CustomElementTagNames);
    }
    return nothing;
  }

  // Only for SSR or imperative calls
  override render() {
    return nothing;
  }
}

/**
 *
 */
export const lazyLoad = directive(LazyLoadDirective);

/**
 *
 */
export type { LazyLoadDirective };
