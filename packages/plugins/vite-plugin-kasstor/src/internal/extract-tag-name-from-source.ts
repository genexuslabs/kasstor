// Fallback: customElements.define('my-tag', ...)
const DEFINE_CUSTOM_ELEMENT_REGEX =
  /customElements\.define\s*\(\s*["']([^"']+)["']/m;

const COMPONENT_DECORATOR_REGEX =
  /@Component\s*\(\s*\{[\s\S]*?tag\s*:\s*["']([^"']+)["']/m;

/**
 * Parse a component module source and extract the declared tag name from
 * @Component decorator or from customElements.define calls.
 */
export const extractTagNameFromSource = (source: string): string | null => {
  // Try to find @Component({... tag: "my-tag" ...})
  const compMatch = source.match(COMPONENT_DECORATOR_REGEX);
  if (compMatch) {
    return compMatch[1];
  }

  const defineMatch = source.match(DEFINE_CUSTOM_ELEMENT_REGEX);
  if (defineMatch) {
    return defineMatch[1];
  }

  return null;
};

