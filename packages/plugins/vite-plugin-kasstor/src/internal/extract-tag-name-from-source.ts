import {
  COMPONENT_TAG_NAME_FOR_TRANSPILED_JS_REGEX,
  DEFINE_CUSTOM_ELEMENT_REGEX
} from "../constants.js";

/**
 * Parse a component module source and extract the declared tag name from
 * @Component decorator or from customElements.define calls.
 */
export const extractTagNameFromSource = (
  source: string,
  componentDecoratorRegex: RegExp
): string | null => {
  // Try to find @Component({... tag: "my-tag" ...})
  const compMatch = source.match(componentDecoratorRegex);

  if (compMatch) {
    return compMatch[2];
  }

  const defineMatch = source.match(DEFINE_CUSTOM_ELEMENT_REGEX);
  if (defineMatch) {
    return defineMatch[1];
  }

  const compiledJSMtach = source.match(
    COMPONENT_TAG_NAME_FOR_TRANSPILED_JS_REGEX
  );
  if (compiledJSMtach) {
    return compiledJSMtach[1];
  }

  return null;
};

