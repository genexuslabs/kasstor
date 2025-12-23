import type { HmrContext, Plugin, ViteDevServer } from "vite";

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

  /**
   * The name of the callback function to execute in the browser
   * when a matched file changes. This function must be available
   * in the global scope (window).
   * @example "handleLitComponentRefresh"
   */
  browserCallbackName: string;
}

// Virtual module ID for the HMR client code
const VIRTUAL_MODULE_ID = "virtual:lit-refresh-client";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

/**
 * Creates a Vite plugin that enables fast refresh for Lit components.
 *
 * This plugin intercepts HMR updates for files matching the specified patterns
 * (Lit components and SCSS files) and instead of triggering a full page reload,
 * it executes a custom callback function in the browser.
 *
 * @param options - Configuration options for the plugin
 * @returns A Vite plugin instance
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { litRefreshPlugin } from "./vite-plugin-lit-refresh";
 *
 * export default defineConfig({
 *   plugins: [
 *     litRefreshPlugin({
 *       componentFilePattern: /\.lit\.ts$/,
 *       browserCallbackName: "onLitComponentUpdate"
 *     })
 *   ]
 * });
 * ```
 */
export function litRefreshPlugin(options: LitRefreshPluginOptions): Plugin {
  const {
    componentFilePattern,
    scssFilePattern = /\.scss$/,
    browserCallbackName
  } = options;

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
   * Generates the client-side code that listens for HMR events
   */
  const getClientCode = (): string => {
    return `
// Lit Refresh Plugin - HMR Event Listener
if (import.meta.hot) {
  import.meta.hot.on("lit-refresh:update", (data) => {
    const callback = window["${browserCallbackName}"];
    if (typeof callback === "function") {
      callback(data);
    } else {
      console.warn(
        "[lit-refresh] Callback '${browserCallbackName}' not found on window. " +
        "Make sure to define window.${browserCallbackName} = (data) => { ... }"
      );
    }
  });
  console.log("[lit-refresh] HMR listener registered");
}
export {};
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
    },

    /**
     * Load the virtual module with client-side HMR code
     */
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return getClientCode();
      }
    },

    /**
     * Transform the HTML to import our virtual module
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
      server.watcher.on("change", (filePath: string) => {
        if (isMatchingFile(filePath)) {
          const fileType = getFileType(filePath);

          // Send custom event to all connected clients
          server.ws.send({
            type: "custom",
            event: "lit-refresh:update",
            data: {
              file: filePath,
              fileType,
              timestamp: Date.now()
            }
          });
        }
      });
    },

    /**
     * Handle HMR updates - prevent full page reload for matching files
     */
    handleHotUpdate(ctx: HmrContext) {
      const { file, server } = ctx;

      if (isMatchingFile(file)) {
        const fileType = getFileType(file);

        console.log(`[lit-refresh] ${fileType} file changed: ${file}`);

        // Send custom event to the client
        server.ws.send({
          type: "custom",
          event: "lit-refresh:update",
          data: {
            file,
            fileType,
            timestamp: Date.now()
          }
        });

        // Return empty array to prevent default HMR behavior (full reload)
        // This tells Vite that we've handled the update ourselves
        return [];
      }

      // Let Vite handle other files normally
    }
  };
}

export default litRefreshPlugin;

