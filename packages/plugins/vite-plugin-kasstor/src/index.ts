import { buildLibrary } from "@genexus/kasstor-build";
import { readFile } from "fs/promises";
import { dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";
import { normalizePath, type HmrContext, type Plugin } from "vite";

import {
  RESOLVED_VIRTUAL_CLIENT_HANDLERS_MODULE_ID,
  RESOLVED_VIRTUAL_CLIENT_MODULE_ID
} from "./constants.js";
import { handleHotUpdate } from "./hooks/handle-hot-update.js";
import { resolveId } from "./hooks/resolve-id.js";
import { transformIndexHtml } from "./hooks/transform-index-html.js";
import { transform } from "./hooks/transform.js";
import { getStringForLogger } from "./internal/get-string-for-logger.js";
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
  let isDevServer = false;

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

  // Cache to store file contents and detect changes
  // Maps file path to file content hash
  const fileContentCache = new Map<string, string>();

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

  return {
    name: "vite-plugin-kasstor",

    // Ensure this plugin runs before Vite's built-in HMR
    enforce: "pre",

    // Define import.meta properties for HMR flags, so the SSRLitElement class
    // decides if adds supports for HMR
    config(_, env) {
      isDevServer = env.command === "serve";

      return {
        define: {
          "globalThis.kasstorCoreHmrComponent": hmrForComponent
        }
      };
    },

    /**
     * Hook that runs at the start of the build process (both dev and production).
     *
     * In this case, we build all the types for the library
     */
    async buildStart() {
      await buildLibrary();
    },

    /**
     * Resolve the virtual module ID.
     *
     * Only applies in dev server.
     */
    resolveId(id: string) {
      return resolveId(id, isDevServer);
    },

    /**
     * Load the virtual module with client-side HMR code.
     *
     * Only applies in dev server.
     */
    load(id: string) {
      // Only works for dev server
      if (!isDevServer) {
        return null;
      }

      if (id === RESOLVED_VIRTUAL_CLIENT_MODULE_ID) {
        return getClientCode;
      }
      if (id === RESOLVED_VIRTUAL_CLIENT_HANDLERS_MODULE_ID) {
        return getClientHandlerModule;
      }
      return null;
    },

    /**
     * Transform the HTML to import our virtual module(s).
     *
     * Only applies in dev server.
     */
    transformIndexHtml() {
      return transformIndexHtml(isDevServer);
    },

    /**
     * Transform source code to replace private fields with public fields in dev mode.
     *
     * Only applies in dev server.
     */
    transform(code: string) {
      return transform({ code, hmrForComponent, isDevServer });
    },

    /**
     * Configure the dev server to watch for file changes and execute custom logic
     * This runs independently of HMR, so it works even if HMR is disabled.
     *
     * In this case, when a file is changed, we update the auto-generated
     * content for the changed files.
     */
    configureServer(server) {
      // Watch for file changes using Vite's watcher
      // This is independent of HMR and will execute even if HMR is disabled
      return () => {
        server.watcher.add(
          server.config.root +
            "/**/*" +
            componentFilePattern.source.replace(/\$/, "")
        );
        server.watcher.add(
          server.config.root +
            "/**/*" +
            scssFilePattern.source.replace(/\$/, "")
        );

        server.watcher.on("change", async (filePath: string) => {
          const fileType = getFileType(filePath);

          if (fileType !== "component") {
            return;
          }

          try {
            // Read the current file content
            const currentContent = await readFile(filePath, "utf-8");

            // Check if the content has changed since last time
            const cachedContent = fileContentCache.get(filePath);
            if (cachedContent === currentContent) {
              // Content hasn't changed, skip buildLibrary
              return;
            }

            // Update the cache with the new content
            fileContentCache.set(filePath, currentContent);

            // Content has changed, run buildLibrary
            const { elapsedTime, updatedComponentDocs } = await buildLibrary({
              // TODO: Add support for incremental librarySummary when running
              // the dev server
              fileGeneration: {
                // At the moment, we won't regenerate the librarySummary on file
                // changes, because it will only contain the processed file
                librarySummary: false
              },

              // Only process the changed component file
              includedPaths: [
                new RegExp(
                  normalizePath(relative(server.config.root, filePath))
                )
              ]
            });

            if (updatedComponentDocs && updatedComponentDocs.length > 0) {
              server.config.logger.info(
                getStringForLogger("docs", updatedComponentDocs, elapsedTime)
              );
            }
          } catch (error) {
            server.config.logger.error(
              `[kasstor] Error processing file ${filePath}: ${error}`
            );
          }
        });
      };
    },

    /**
     * Handle HMR updates - prevent full page reload for matching files
     */
    handleHotUpdate(ctx: HmrContext) {
      return handleHotUpdate({
        ctx,
        componentFilePattern,
        debug,
        getFileType,
        hmrForComponent,
        hmrForStyles
      });
    }
  };
}

export default kasstor;

