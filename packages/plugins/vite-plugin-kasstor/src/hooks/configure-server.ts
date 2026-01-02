import { buildLibrary, type KasstorBuildOptions } from "@genexus/kasstor-build";
import { readFile } from "fs/promises";
import { relative } from "path";
import { normalizePath, type ViteDevServer } from "vite";

import { getStringForLogger } from "../internal/get-string-for-logger.js";
import { invalidateNextUpdateForComponents } from "../internal/invalidate-next-hmr-for-component.js";
import type { KasstorFileType } from "../typings/internal-types";

/**
 * Configure the dev server to watch for file changes and execute custom logic
 * This runs independently of HMR, so it works even if HMR is disabled.
 *
 * In this case, when a file is changed, we update the auto-generated
 * content for the changed files.
 */
export const configureServer = (options: {
  fileContentCache: Map<string, string>;
  getFileType: (filePath: string) => KasstorFileType;
  kasstorBuildOptions: KasstorBuildOptions;
  server: ViteDevServer;
}) => {
  const { fileContentCache, getFileType, kasstorBuildOptions, server } =
    options;
  // Watch for file changes using Vite's watcher
  // This is independent of HMR and will execute even if HMR is disabled
  return () => {
    // Watch any JS file
    server.watcher.add(server.config.root + "/**/*.{ts|js}");

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
        const { elapsedTime, updatedComponentDocs } = await buildLibrary(
          {
            ...kasstorBuildOptions,

            // Only process the changed component file
            includedPaths: [
              new RegExp(normalizePath(relative(server.config.root, filePath)))
            ]
          },
          true
        );

        if (updatedComponentDocs && updatedComponentDocs.length > 0) {
          // This will prevent a common issue, where the docs update of the
          // component triggers and extra HMR update, so at the end of the
          // day, the component is updated twice.
          invalidateNextUpdateForComponents(updatedComponentDocs);

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
};

