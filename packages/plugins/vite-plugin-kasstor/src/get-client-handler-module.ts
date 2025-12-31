/**
 * Send a performance metric to the dev server
 * @param operationId - Unique identifier for this operation
 * @param operationType - Type of operation (e.g., 'scss-update', 'component-update')
 */
const sendPerformanceMetric = (
  operationId: string,
  operationType: string,
  components: string[]
) => {
  if (typeof import.meta !== "undefined" && import.meta.hot) {
    import.meta.hot.send("custom:kasstor:performance", {
      operationId,
      operationType,
      components
    });
  }
};

const replaceStyles = (css: string, tags: string[], operationId: string) => {
  // Prefer the global registry provided by the library (populated by SSRLitElement)
  const kasstorCoreRegisteredInstances =
    typeof globalThis !== "undefined"
      ? globalThis.kasstorCoreRegisteredInstances
      : undefined;

  if (!kasstorCoreRegisteredInstances) {
    return;
  }

  // Share the new stylesheet across all instances to reduce memory usage
  const newStyleSheet = new CSSStyleSheet();
  newStyleSheet.replaceSync(css);

  // Update styles using global registry (no monkey patching needed)
  for (const tag of tags) {
    const instances = kasstorCoreRegisteredInstances.get(tag);
    if (!instances || instances.size === 0) {
      console.warn("[kasstor] global registry: No instances for", tag);
      continue;
    }

    for (const el of instances) {
      if (!el.shadowRoot) {
        continue;
      }
      const adopted = el.shadowRoot.adoptedStyleSheets || [];
      // Replace first stylesheet or prepend
      if (adopted.length > 0) {
        const copy = [...adopted];
        copy[0] = newStyleSheet;
        el.shadowRoot.adoptedStyleSheets = copy;
      } else {
        el.shadowRoot.adoptedStyleSheets = [newStyleSheet];
      }
    }
  }

  // Send performance metric to dev server when operation completes
  sendPerformanceMetric(operationId, "style", tags);
};

export async function handleScssUpdate(
  scssPath: string,
  tags: string[],
  operationId: string
) {
  try {
    const cssUrl = scssPath + "?inline&t=" + Date.now();
    const res = await fetch(cssUrl);
    if (!res.ok) {
      throw new Error("Failed to fetch CSS: " + res.status);
    }
    const moduleText = await res.text();

    let css = moduleText;
    try {
      const blob = new Blob([moduleText], { type: "application/javascript" });

      const blobUrl = URL.createObjectURL(blob);
      const mod = await import(/* @vite-ignore */ blobUrl);
      URL.revokeObjectURL(blobUrl); // Free the memory

      if (mod && mod.default) {
        css = mod.default;
      }
    } catch (e) {
      console.error(e);
      // Fallback to raw text as CSS
    }

    replaceStyles(css, tags, operationId);
  } catch (e) {
    console.error("[kasstor] Error while hot updating styles", e);
  }
}

/**
 * Handle component module updates.
 *
 * The goal here is simply to force the component module to be re-evaluated
 * so that the @Component decorator runs again. The decorator uses the HMR
 * runtime (`register(tagName, classRef)`) which will swap the implementation
 * behind the proxies and trigger updates on existing instances.
 */
export async function handleComponentUpdate(
  componentPath: string,
  tags: string[],
  operationId: string
) {
  try {
    // Use a cache-busting query param so the browser and Vite deliver
    // the latest version of the module.
    const url = `${componentPath}?t=${Date.now()}`;

    // Avoid Vite trying to pre-bundle this import by annotating it.
    await import(/* @vite-ignore */ url);

    sendPerformanceMetric(operationId, "component", tags);
  } catch (e) {
    console.error("[kasstor] Error while hot updating components", e);
  }
}

