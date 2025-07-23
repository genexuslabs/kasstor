import { setObserverIfNotDefined } from "./set-observer";

// Initialize the observer and the lazyLoadedElements Set
setObserverIfNotDefined(discover);

const { defineCustomElementsWatcher, lazyLoadedElements } =
  globalThis.litDevKit!;

const autoLoadErrorMessage = (tagName: string, reason: string) => {
  const errorMessage = `Unable to autoload <${tagName}>. ${reason}`;
  console.warn(errorMessage);
  return errorMessage;
};

/**
 * Checks a node for undefined elements and attempts to register them.
 */
export async function discover(root: Element | ShadowRoot) {
  const rootTagName = root instanceof Element ? root.tagName.toLowerCase() : "";
  const rootIsChameleonElement = rootTagName.startsWith(LIBRARY_PREFIX);

  const undefinedCustomElements = root.querySelectorAll(":not(:defined)");
  const tagsToRegister = new Set<ChameleonPublicControlsTagName>();

  console.log(
    "discover...",
    [...undefinedCustomElements].map(el => el.tagName.toLowerCase())
  );

  for (const element of undefinedCustomElements) {
    const tagName = element.tagName.toLowerCase();

    if (
      tagName.startsWith(LIBRARY_PREFIX) &&
      !lazyLoadedElements.has(tagName as never)
    ) {
      tagsToRegister.add(tagName as never);
    }
  }

  // If the root element is an undefined Chameleon component, add it to the list
  if (rootIsChameleonElement && !lazyLoadedElements.has(rootTagName as never)) {
    tagsToRegister.add(rootTagName as never);
  }

  await Promise.allSettled(
    tagsToRegister.keys().map(tagName => register(tagName))
  );
}

/**
 * Registers an element by tag name.
 */
function register(tagName: ChameleonPublicControlsTagName): Promise<void> {
  // The element has been already defined in the page without using the lazy
  // loader, so we only have to add it to the `lazyLoadedElements` Set
  if (customElements.get(tagName)) {
    lazyLoadedElements.add(tagName);
    return Promise.resolve();
  }

  // Register it
  return new Promise((resolve, reject) => {
    const lazyLoadFunction = getChameleonComponentPath(tagName);

    if (lazyLoadFunction === undefined) {
      return reject(
        new Error(
          autoLoadErrorMessage(
            tagName,
            `The component doesn't exists in Chameleon. Please, verify that the "${tagName}" element exists in the version of Chameleon that you are using.`
          )
        )
      );
    }

    lazyLoadFunction
      .then(component => {
        component.default.define();
        lazyLoadedElements.add(tagName);
        resolve();
      })
      .catch(err => reject(new Error(autoLoadErrorMessage(tagName, err))));
  });
}

// TODO: Add support for awaiting element definitions. Example:
// if (!customElements.get(tag)) {
//   await customElements.whenDefined(tag)
// }
export const defineCustomElements = () => {
  // Initial discovery
  discover(document.body);

  // Listen for new undefined elements
  defineCustomElementsWatcher.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
};

