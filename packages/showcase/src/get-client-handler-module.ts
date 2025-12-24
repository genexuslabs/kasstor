const replaceStyles = (css, tags) => {
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
      console.warn("[lit-refresh] global registry: No instances for", tag);
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

    console.log(
      "[lit-refresh] (global) Updated styles for",
      (instances && instances.size) || 0,
      "instance(s) of",
      tag
    );
  }
};

export async function handleScssUpdate(scssPath, tags) {
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
      const mod = await import(blobUrl);
      URL.revokeObjectURL(blobUrl); // Free the memory

      if (mod && mod.default) {
        css = mod.default;
      }
    } catch (e) {
      console.error(e);
      // Fallback to raw text as CSS
    }

    replaceStyles(css, tags);
  } catch (e) {
    console.error("[lit-refresh] handleScssUpdate error", e);
  }
}

