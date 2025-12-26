import { readFile } from "fs/promises";
import { dirname, posix, relative, resolve } from "path";
import { fileURLToPath } from "url";
import type { HmrContext, ModuleNode, Plugin, ViteDevServer } from "vite";
import { transformPrivateFieldsToPublic } from "./transform-private-fields.js";
import type { KasstorPluginOptions } from "./types";

export type { KasstorPluginOptions };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Virtual module that contains logic to fetch transpiled CSS and replace styles
 * This module is also served as a virtual module so we can import it from the
 * client HMR listener above.
 */
const getClientHandlerModule = await readFile(
  resolve(__dirname, "./get-client-handler-module.js"),
  "utf-8"
);

/**
 * Generates the client-side code that listens for HMR events.
 * The client module uses import.meta.hot and will be served by Vite.
 */
const getClientCode = await readFile(
  resolve(__dirname, "./get-client-code.js"),
  "utf-8"
);

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
  startNode: ModuleNode | null,
  componentFilePattern: RegExp
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
export function kasstor(options?: KasstorPluginOptions): Plugin {
  const {
    componentFilePattern = /\.lit\.ts$/,
    debug,
    hmr,
    scssFilePattern = /\.scss$/
  } = options ?? {};

  const hmrForComponent =
    typeof hmr === "object" ? hmr.component !== false : hmr !== false;
  const hmrForStyles =
    typeof hmr === "object" ? hmr.styles !== false : hmr !== false;

  /**
   * Checks if a file path matches any of the configured patterns
   */
  const isMatchingFile = (filePath: string): boolean =>
    componentFilePattern.test(filePath) || scssFilePattern.test(filePath);

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

    const componentModulePaths = findReferencingComponentModules(
      node,
      componentFilePattern
    );
    const tags = new Set<string>();

    for (const compPath of componentModulePaths) {
      try {
        const code = await readFile(compPath, "utf-8");
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

  return {
    name: "vite-plugin-lit-refresh",

    // Only apply this plugin in development mode
    apply: "serve",

    // Ensure this plugin runs before Vite's built-in HMR
    enforce: "pre",

    // Define import.meta properties for HMR flags, so the SSRLitElement class
    // decides if adds supports for HMR
    config() {
      return {
        define: {
          "globalThis.kasstorCoreHmrComponent": hmrForComponent
        }
      };
    },

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
        return getClientCode;
      }
      if (id === "\0virtual:lit-refresh-handler") {
        return getClientHandlerModule;
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
     * Transform source code to replace private fields with public fields in dev mode
     */
    transform(code: string) {
      if (!hmrForComponent) {
        return null;
      }

      // Check if the code contains private fields
      if (!/#[a-zA-Z_$][a-zA-Z0-9_$]*/.test(code)) {
        return null;
      }

      const transformed = transformPrivateFieldsToPublic(code);

      if (transformed === code) {
        return null;
      }

      return {
        code: transformed,
        map: null
      };
    },

    /**
     * Handle HMR updates - prevent full page reload for matching files
     */
    async handleHotUpdate(ctx: HmrContext) {
      const { file, server } = ctx;

      const hmrIsDisabled =
        hmr === false || (!hmrForComponent && !hmrForStyles);

      if (hmrIsDisabled || !isMatchingFile(file)) {
        // Let Vite handle other files normally
        return undefined;
      }

      const fileType = getFileType(file);

      if (
        (fileType === "component" && !hmrForComponent) ||
        (fileType === "scss" && !hmrForStyles)
      ) {
        // Let Vite handle other files normally
        return undefined;
      }

      // Normalize the file path
      const normalizedPath = posix.join(
        "/",
        relative(server.config.root, file)
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
          timestamp: Date.now(),
          debug
        }
      });

      // Return empty array to prevent default HMR behavior (full reload)
      return [];
    }
  };
}

export default kasstor;

