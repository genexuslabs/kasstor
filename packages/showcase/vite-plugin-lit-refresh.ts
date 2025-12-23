import fs from "fs/promises";
import path from "path";
import type { HmrContext, ModuleNode, Plugin, ViteDevServer } from "vite";

/**
 * Options for the Lit Refresh Vite plugin
 */
export interface LitRefreshPluginOptions {
  /**
   * Regular expression to match Lit component files.
   * Files matching this pattern will trigger the refresh callback.
   * @example /\.lit\.ts$/
   */
  componentFilePattern: RegExp;

  /**
   * Regular expression to match SCSS files for Lit components.
   * Defaults to /\.scss$/ if not provided.
   */
  scssFilePattern?: RegExp;
}

// Virtual module ID for the HMR client code
const VIRTUAL_MODULE_ID = "virtual:lit-refresh-client";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

/**
 * Creates a Vite plugin that enables fast refresh for Lit components.
 *
 * This plugin intercepts HMR updates for files matching the specified patterns
 * (Lit components and SCSS files) and instead of triggering a full page reload,
 * it replaces the adoptedStyleSheets in the connected components.
 *
 * The plugin now uses the Vite module graph to determine which component
 * modules actually import (directly or indirectly) a given SCSS file, so
 * we can accurately determine which tag names must have their styles replaced.
 */
export function litRefreshPlugin(options: LitRefreshPluginOptions): Plugin {
  const { componentFilePattern, scssFilePattern = /\.scss$/ } = options;

  /**
   * Checks if a file path matches any of the configured patterns
   */
  const isMatchingFile = (filePath: string): boolean => {
    return (
      componentFilePattern.test(filePath) || scssFilePattern.test(filePath)
    );
  };

  /**
   * Determines the type of file that changed
   */
  const getFileType = (filePath: string): "component" | "scss" | "unknown" => {
    if (componentFilePattern.test(filePath)) {
      return "component";
    }
    if (scssFilePattern.test(filePath)) {
      return "scss";
    }
    return "unknown";
  };

  /**
   * Given a module node, returns its absolute file path if possible
   */
  const moduleNodeToFilePath = (node?: ModuleNode | null): string | null => {
    if (!node) {
      return null;
    }
    if (node.file) {
      return node.file;
    }
    if (node.id && node.id.startsWith("/@fs/")) {
      return node.id.replace("/@fs/", "");
    }
    if (node.id && node.id.startsWith("file://")) {
      return node.id.replace("file://", "");
    }
    return node.id ?? null;
  };

  /**
   * Walk up the importer graph to find all modules that match componentFilePattern.
   * Returns an array of module file paths (absolute) for component modules.
   */
  const findReferencingComponentModules = (
    startNode: ModuleNode | null
  ): string[] => {
    if (!startNode) {
      return [];
    }
    const visited = new Set<ModuleNode>();
    const queue: ModuleNode[] = [startNode];
    const result = new Set<string>();

    while (queue.length) {
      const node = queue.shift();
      if (!node || visited.has(node)) {
        continue;
      }
      visited.add(node);

      // If this node represents a component module, record it
      const filePath = moduleNodeToFilePath(node);
      if (filePath && componentFilePattern.test(filePath)) {
        result.add(filePath);
        // do not need to traverse its importers further for this path
      } else {
        // otherwise enqueue importers
        const importers = node.importers ?? new Set();
        for (const importer of importers) {
          if (!visited.has(importer)) {
            queue.push(importer);
          }
        }
      }
    }

    return Array.from(result);
  };

  /**
   * Parse a component module source and extract the declared tag name from
   * @Component decorator or from customElements.define calls.
   */
  const extractTagNameFromSource = (source: string): string | null => {
    // Try to find @Component({... tag: "my-tag" ...})
    const compRegex = /@Component\s*\(\s*\{[\s\S]*?tag\s*:\s*["']([^"']+)["']/m;
    const compMatch = source.match(compRegex);
    if (compMatch) {
      return compMatch[1];
    }

    // Fallback: customElements.define('my-tag', ...)
    const defineRegex = /customElements\.define\s*\(\s*["']([^"']+)["']/m;
    const defineMatch = source.match(defineRegex);
    if (defineMatch) {
      return defineMatch[1];
    }

    return null;
  };

  /**
   * Given a scss file absolute path and the dev server, return all component tag names
   * that (directly or indirectly) import that scss file by inspecting the module graph
   * and parsing component module sources to extract the tag name.
   */
  const findReferencingTags = async (
    scssPath: string,
    server: ViteDevServer
  ): Promise<string[]> => {
    // Try to get the module node for the scss path
    // The module id in the graph is often the absolute file path or '/@fs/abs/path'
    let node = server.moduleGraph.getModuleById(scssPath) as
      | ModuleNode
      | null
      | undefined;
    if (!node) {
      // try with /@fs/ prefix
      node = server.moduleGraph.getModuleById(`/@fs/${scssPath}`) as
        | ModuleNode
        | null
        | undefined;
    }
    if (!node) {
      // try to search all modules and match file
      for (const mod of server.moduleGraph.urlToModuleMap?.values() ?? []) {
        const file = moduleNodeToFilePath(mod as ModuleNode);
        if (file === scssPath) {
          node = mod as ModuleNode;
          break;
        }
      }
    }

    if (!node) {
      return [];
    }

    const componentModulePaths = findReferencingComponentModules(node);
    const tags = new Set<string>();

    for (const compPath of componentModulePaths) {
      try {
        const code = await fs.readFile(compPath, "utf-8");
        const tag = extractTagNameFromSource(code);
        if (tag) {
          tags.add(tag);
        }
      } catch (e) {
        // ignore read errors
        server.config.logger.warn(
          `[lit-refresh] Could not read module ${compPath}: ${e}`
        );
      }
    }

    return Array.from(tags);
  };

  /**
   * Generates the client-side code that listens for HMR events.
   * The client module uses import.meta.hot and will be served by Vite.
   */
  const getClientCode = (): string => {
    return `
// Lit Refresh Plugin - HMR Event Listener (client)
if (import.meta.hot) {
  import.meta.hot.on("lit-refresh:update", (data) => {
    console.log('[lit-refresh] Received update (client):', data);

    if (data.fileType === 'scss') {
      // data.tags contains the component tagNames that reference this SCSS file
        if (Array.isArray(data.tags) && data.tags.length > 0) {
          import('virtual:lit-refresh-handler').then(m => {
            // virtual module provided by the plugin
            if (m && typeof m.handleScssUpdate === 'function') {
              m.handleScssUpdate(data.file, data.tags);
            }
          }).catch(e => console.error('[lit-refresh] failed to load handler:', e));
        }
    }
  });
  console.log('[lit-refresh] HMR listener registered (client)');
}
export {};
`;
  };

  /**
   * Virtual module that contains logic to fetch transpiled CSS and replace styles
   * This module is also served as a virtual module so we can import it from the
   * client HMR listener above.
   */
  const getClientHandlerModule = (): string => {
    return `
export async function handleScssUpdate(scssPath, tags) {
  try {
    const cssUrl = scssPath + '?inline&t=' + Date.now();
    const res = await fetch(cssUrl);
    if (!res.ok) throw new Error('Failed to fetch CSS: ' + res.status);
    const moduleText = await res.text();

    // Try to dynamically import the returned module text (if it's a JS module exporting default)
    let css = moduleText;
    try {
      const blob = new Blob([moduleText], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const mod = await import(blobUrl);
      URL.revokeObjectURL(blobUrl);
      if (mod && mod.default) css = mod.default;
    } catch (e) {
      // If dynamic import fails, fallback to using the raw moduleText as CSS
    }

    // Replace styles for all provided tags
    for (const tag of tags) {
      try {
        replaceStylesForComponent(tag, css);
      } catch (e) {
        console.error('[lit-refresh] error replacing styles for', tag, e);
      }
    }
  } catch (e) {
    console.error('[lit-refresh] handleScssUpdate error', e);
  }
}

// --- Client-side registry and helper (same idea as previous client implementation) ---
const componentRegistry = new Map();
const tagToStyleSheetMap = new Map();
const originalDefine = customElements.define.bind(customElements);

function registerComponent(element) {
  const tagName = element.tagName.toLowerCase();
  if (!componentRegistry.has(tagName)) componentRegistry.set(tagName, new Set());
  componentRegistry.get(tagName).add(element);
  if (element.shadowRoot && element.shadowRoot.adoptedStyleSheets.length > 0) {
    const stylesheet = element.shadowRoot.adoptedStyleSheets[0];
    if (!tagToStyleSheetMap.has(tagName)) tagToStyleSheetMap.set(tagName, stylesheet);
  }
}

function unregisterComponent(element) {
  const tagName = element.tagName.toLowerCase();
  const set = componentRegistry.get(tagName);
  if (set) {
    set.delete(element);
    if (set.size === 0) componentRegistry.delete(tagName);
  }
}

/**
 * Patch an already-defined custom element constructor to ensure instances
 * will be registered when they connect.
 */
function patchConstructor(name) {
  const ctor = customElements.get(name);
  if (!ctor) return;
  const proto = ctor.prototype;
  if (!proto) return;

  const origConnected = proto.connectedCallback;
  const origDisconnected = proto.disconnectedCallback;

  if (proto.__litRefreshPatched) return; // avoid double patching
  proto.__litRefreshPatched = true;

  proto.connectedCallback = function() {
    if (origConnected) origConnected.call(this);
    registerComponent(this);
  };
  proto.disconnectedCallback = function() {
    unregisterComponent(this);
    if (origDisconnected) origDisconnected.call(this);
  };
}

/**
 * Register existing instances already in the DOM (in case the module ran late)
 */
function registerExistingInstances() {
  // customElements is not iterable in browsers — iterate DOM instead to
  // collect tags and patch constructors for those defined.
  const seenTags = new Set();
  document.querySelectorAll('*').forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (!seenTags.has(tag)) {
      seenTags.add(tag);
      try {
        if (customElements.get(tag)) {
          patchConstructor(tag);
        }
      } catch (e) {
        // ignore
      }
    }
  });

  // Register existing instances
  document.querySelectorAll('*').forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (customElements.get(tag)) {
      registerComponent(el);
    }
  });
}

// Patch define to also patch new constructors
customElements.define = function(name, constructor, options) {
  const originalConnected = constructor.prototype.connectedCallback;
  const originalDisconnected = constructor.prototype.disconnectedCallback;
  constructor.prototype.connectedCallback = function() {
    if (originalConnected) originalConnected.call(this);
    registerComponent(this);
  };
  constructor.prototype.disconnectedCallback = function() {
    unregisterComponent(this);
    if (originalDisconnected) originalDisconnected.call(this);
  };
  const result = originalDefine(name, constructor, options);
  // patch the constructor we just defined
  patchConstructor(name);
  return result;
};

// Run registration for already defined elements and existing instances
setTimeout(() => {
  try {
    registerExistingInstances();
  } catch (e) {
    console.error('[lit-refresh] registerExistingInstances error', e);
  }
}, 0);

function replaceStylesForComponent(tagName, newCss) {
  const instances = componentRegistry.get(tagName);
  if (!instances || instances.size === 0) {
    console.warn('[lit-refresh] No instances for', tagName);
    return;
  }

  const newStyleSheet = new CSSStyleSheet();
  newStyleSheet.replaceSync(newCss);
  const old = tagToStyleSheetMap.get(tagName);

  let updated = 0;
  for (const el of instances) {
    if (!el.shadowRoot) continue;
    const adopted = el.shadowRoot.adoptedStyleSheets || [];
    if (old) {
      const idx = adopted.indexOf(old);
      if (idx !== -1) {
        const copy = [...adopted];
        copy[idx] = newStyleSheet;
        el.shadowRoot.adoptedStyleSheets = copy;
        updated++;
      } else {
        el.shadowRoot.adoptedStyleSheets = [newStyleSheet, ...adopted];
        updated++;
      }
    } else {
      if (adopted.length > 0) el.shadowRoot.adoptedStyleSheets = [newStyleSheet, ...adopted.slice(1)];
      else el.shadowRoot.adoptedStyleSheets = [newStyleSheet];
      updated++;
    }
  }
  tagToStyleSheetMap.set(tagName, newStyleSheet);
  console.log('[lit-refresh] Updated styles for', updated, 'instance(s) of', tagName);
}
`;
  };

  return {
    name: "vite-plugin-lit-refresh",

    // Ensure this plugin runs before Vite's built-in HMR
    enforce: "pre",

    /**
     * Resolve the virtual module ID
     */
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      if (id === "virtual:lit-refresh-handler") {
        return "\0virtual:lit-refresh-handler";
      }
      return null;
    },

    /**
     * Load the virtual module with client-side HMR code
     */
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return getClientCode();
      }
      if (id === "\0virtual:lit-refresh-handler") {
        return getClientHandlerModule();
      }
      return null;
    },

    /**
     * Transform the HTML to import our virtual module(s)
     */
    transformIndexHtml() {
      return [
        {
          tag: "script",
          attrs: { type: "module", src: `/@id/__x00__${VIRTUAL_MODULE_ID}` },
          injectTo: "head-prepend"
        }
      ];
    },

    /**
     * Configure the dev server to handle custom HMR events
     */
    configureServer(server: ViteDevServer) {
      // Listen for file changes and send custom events to the client
      server.watcher.on("change", async (filePath: string) => {
        if (isMatchingFile(filePath)) {
          const fileType = getFileType(filePath);

          // Normalize the file path to be relative to the project root for client fetches
          const normalizedPath = path.posix.join(
            "/",
            path.relative(server.config.root, filePath)
          );

          // Compute tags for scss files
          let tags: string[] = [];
          if (fileType === "scss") {
            tags = await findReferencingTags(filePath, server);
          }

          // Send custom event to all connected clients
          server.ws.send({
            type: "custom",
            event: "lit-refresh:update",
            data: {
              file: normalizedPath,
              fileType,
              tags,
              timestamp: Date.now()
            }
          });
        }
      });
    },

    /**
     * Handle HMR updates - prevent full page reload for matching files
     */
    async handleHotUpdate(ctx: HmrContext) {
      const { file, server } = ctx;

      if (isMatchingFile(file)) {
        const fileType = getFileType(file);

        // Normalize the file path
        const normalizedPath = path.posix.join(
          "/",
          path.relative(server.config.root, file)
        );

        // Compute tags when scss changed
        let tags: string[] = [];
        if (fileType === "scss") {
          tags = await findReferencingTags(file, server);
        }

        server.ws.send({
          type: "custom",
          event: "lit-refresh:update",
          data: {
            file: normalizedPath,
            fileType,
            tags,
            timestamp: Date.now()
          }
        });

        // Return empty array to prevent default HMR behavior (full reload)
        return [];
      }

      // Let Vite handle other files normally
      return undefined;
    }
  };
}

export default litRefreshPlugin;

