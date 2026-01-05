import { buildLibrary, type KasstorBuildOptions } from "@genexus/kasstor-build";
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { type HmrContext, type Plugin } from "vite";

import {
  DEFAULT_COMPONENT_FILE_PATTERN,
  DEFAULT_SCSS_FILE_PATTERN,
  LIBRARY_ANALYSIS_MESSAGES
} from "./constants.js";
import { configureServer } from "./hooks/configure-server.js";
import { handleHotUpdate } from "./hooks/handle-hot-update.js";
import { load } from "./hooks/load.js";
import { resolveId } from "./hooks/resolve-id.js";
import { transformIndexHtml } from "./hooks/transform-index-html.js";
import { transform } from "./hooks/transform.js";
import { getComponentDecoratorRegex } from "./internal/get-component-decorator-regex.js";
import {
  getNormalCommandForLogger,
  getUpdatedCommandForLogger,
  setBuildingLibraryState
} from "./internal/get-string-for-logger.js";
import type { KasstorFileType } from "./typings/internal-types.js";
import type { KasstorPluginOptions } from "./typings/types.js";

export type { KasstorPluginOptions };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generates the client-side code that listens for HMR events.
 * The client module uses import.meta.hot and will be served by Vite.
 */
const hmrManagerCode = await readFile(
  resolve(__dirname, "./get-client-code.js"),
  "utf-8"
);

/**
 * Virtual module that contains logic to fetch transpiled CSS and replace styles
 * This module is also served as a virtual module so we can import it from the
 * client HMR listener above.
 */
const hmrHandlersCode = await readFile(
  resolve(__dirname, "./get-client-handler-module.js"),
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
export async function kasstor(options?: KasstorPluginOptions): Promise<Plugin> {
  let isDevServer = false;

  const {
    customComponentDecoratorNames,
    debug,
    defaultComponentAccess,
    excludedPaths = [],
    excludedPublicMethods,
    fileGeneration,
    hmr,
    includedPaths,
    insights
  } = options ?? {};

  const allExcludedPaths = Array.isArray(excludedPaths)
    ? excludedPaths
    : [excludedPaths];
  let includedComponentPaths: RegExp[] = [DEFAULT_COMPONENT_FILE_PATTERN];
  let includedStylePaths: RegExp[] = [DEFAULT_SCSS_FILE_PATTERN];

  const performanceInsights =
    (typeof insights === "object" ? insights.performance : insights) ?? false;

  if (includedPaths?.component) {
    includedComponentPaths = Array.isArray(includedPaths.component)
      ? includedPaths.component
      : [includedPaths.component];
  }
  if (includedPaths?.styles) {
    includedStylePaths = Array.isArray(includedPaths.styles)
      ? includedPaths.styles
      : [includedPaths.styles];
  }

  const kasstorBuildOptions: KasstorBuildOptions = {
    defaultComponentAccess,
    excludedPaths,
    excludedPublicMethods,
    fileGeneration,
    includedPaths: includedComponentPaths
  };

  const componentDecoratorRegex = getComponentDecoratorRegex(
    customComponentDecoratorNames === undefined ||
      customComponentDecoratorNames.length === 0
      ? ["Component"]
      : customComponentDecoratorNames
  );

  const hmrForComponent =
    typeof hmr === "object" ? hmr.component !== false : hmr !== false;
  const hmrForStyles =
    typeof hmr === "object" ? hmr.styles !== false : hmr !== false;

  /**
   * Determines the type of file that changed
   */
  const getFileType = (filePath: string): KasstorFileType => {
    if (allExcludedPaths.some(pattern => pattern.test(filePath))) {
      return "excluded";
    }
    if (includedComponentPaths.some(pattern => pattern.test(filePath))) {
      return "component";
    }
    if (includedStylePaths.some(pattern => pattern.test(filePath))) {
      return "scss";
    }
    return "unknown";
  };

  return {
    name: "vite-plugin-kasstor",

    // Ensure this plugin runs before Vite's built-in HMR
    enforce: "pre",

    // Define import.meta properties for HMR flags, so the KasstorElement class
    // decides if adds supports for HMR
    config(_, env) {
      isDevServer = env.command === "serve";

      return {
        define: {
          "globalThis.kasstorCoreHmrEnabled": hmrForComponent
        }
      };
    },

    /**
     * Hook that runs at the start of the build process (both dev and production).
     *
     * In this case, we build all the types for the library
     */
    async buildStart(this) {
      setBuildingLibraryState("start");
      this.info(
        getNormalCommandForLogger("start", LIBRARY_ANALYSIS_MESSAGES.START)
      );

      const {
        elapsedTimes,
        updatedAutoGeneratedReadmesForComponents,
        updatedAutoGeneratedTypesForComponents
      } = await buildLibrary(kasstorBuildOptions, true);

      this.info(
        getNormalCommandForLogger(
          "end",
          LIBRARY_ANALYSIS_MESSAGES.FINISH,
          elapsedTimes.analysis
        )
      );

      if (updatedAutoGeneratedTypesForComponents.length !== 0) {
        this.info(
          getUpdatedCommandForLogger(
            "global types",
            updatedAutoGeneratedTypesForComponents,
            elapsedTimes.autoGeneratedTypesForComponents
          )
        );
      }
      if (updatedAutoGeneratedReadmesForComponents.length !== 0) {
        this.info(
          getUpdatedCommandForLogger(
            "readme",
            updatedAutoGeneratedReadmesForComponents,
            elapsedTimes.autoGeneratedReadmesForComponents
          )
        );
      }
      if (elapsedTimes.autoGeneratedExportTypesForComponents !== 0) {
        this.info(
          getNormalCommandForLogger(
            "end",
            LIBRARY_ANALYSIS_MESSAGES.EXPORTED_TYPES,
            elapsedTimes.autoGeneratedExportTypesForComponents
          )
        );
      }
      setBuildingLibraryState("end");
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
      return load({
        hmrManagerCode,
        hmrHandlersCode,
        id,
        isDevServer
      });
    },

    /**
     * Transform the HTML to import our virtual module(s).
     *
     * Only applies in dev server.
     */
    transformIndexHtml() {
      return transformIndexHtml({ isDevServer, performanceInsights });
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
      return configureServer({
        getFileType,
        kasstorBuildOptions,
        server
      });
    },

    /**
     * Handle HMR updates - prevent full page reload for matching files
     */
    handleHotUpdate(ctx: HmrContext) {
      return handleHotUpdate({
        componentDecoratorRegex,
        ctx,
        debug,
        getFileType,
        hmrForComponent,
        hmrForStyles,
        includedComponentPaths
      });
    }
  };
}

export default kasstor;
