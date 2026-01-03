import { posix, relative } from "path";
import { type HmrContext, type ModuleNode, type ViteDevServer } from "vite";
import { findReferencingTagsForComponent } from "../internal/find-referencing-tags-for-component.js";
import {
  findReferencingTagsForHelper,
  type ComponentReference
} from "../internal/find-referencing-tags-for-helper.js";
import { findReferencingTagsForScss } from "../internal/find-referencing-tags-for-scss.js";
import { getUpdatedCommandForLogger } from "../internal/get-string-for-logger.js";
import { checkIfShouldInvalidateNextUpdate } from "../internal/invalidate-next-hmr-for-component.js";
import type { KasstorFileType } from "../typings/internal-types.js";

/**
 * Map to track operation start times for performance metrics
 * operationId -> startTime (in milliseconds)
 */
const operationTimings = new Map<string, number>();

let listenerRegistered = false;

const registerListenerForPerformanceMetrics = (server: ViteDevServer) => {
  if (listenerRegistered) {
    return;
  }
  listenerRegistered = true;

  server.ws.on("custom:kasstor:performance", (data: unknown) => {
    const message = data as {
      operationId: string;
      operationType: "global types" | "readme" | "component" | "style";
      components: string[];
    };
    const { components, operationId, operationType } = message;

    // Calculate elapsed time from when the operation started
    const startTime = operationTimings.get(operationId);

    if (startTime) {
      const elapsedTime = performance.now() - startTime;

      server.config.logger.info(
        getUpdatedCommandForLogger(operationType, components, elapsedTime)
      );

      // Clean up the timing entry
      operationTimings.delete(operationId);
    }
  });
};

/**
 * Handle HMR updates - prevent full page reload for matching files
 */
export const handleHotUpdate = async (options: {
  componentDecoratorRegex: RegExp;
  ctx: HmrContext;
  debug: boolean | undefined;
  getFileType: (filePath: string) => KasstorFileType;
  hmrForComponent: boolean;
  hmrForStyles: boolean;
  includedComponentPaths: RegExp[];
}) => {
  const {
    componentDecoratorRegex,
    ctx,
    debug,
    getFileType,
    hmrForComponent,
    hmrForStyles,
    includedComponentPaths
  } = options;
  const { file, server } = ctx;

  const hmrIsDisabled = !hmrForComponent && !hmrForStyles;
  const fileType = getFileType(file);

  // Listen for performance metrics from the client
  registerListenerForPerformanceMetrics(server);

  if (
    hmrIsDisabled ||
    (fileType === "component" && !hmrForComponent) ||
    (fileType === "unknown" && !hmrForComponent) ||
    (fileType === "scss" && !hmrForStyles)
  ) {
    // Let Vite handle other files normally
    return undefined;
  }

  let componentsThatUsedTheUtility: ComponentReference[] = [];

  // Generate a unique operation ID for tracking performance metrics
  const operationId = `${fileType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Record the start time for this operation
  operationTimings.set(operationId, performance.now());

  // Check if the file is being used by a component
  if (fileType === "unknown") {
    componentsThatUsedTheUtility = await findReferencingTagsForHelper({
      componentDecoratorRegex,
      includedComponentPaths,
      helperPath: file,
      server
    });

    // The file was not referenced by any component, so trigger a full reload
    // TODO: We should investigate if we really want to trigger a full reload.
    // In some cases we could handle this more gracefully.
    if (componentsThatUsedTheUtility.length === 0) {
      operationTimings.delete(operationId);

      // Let Vite handle other files normally
      return undefined;
    }

    const invalidatedModules = new Set<ModuleNode>();

    // Since the file was referenced by some components, invalidate those
    // modules and trigger HMR in the components to download again those
    // modules
    for (const mod of ctx.modules) {
      server.moduleGraph.invalidateModule(
        mod,
        invalidatedModules,
        ctx.timestamp,
        true
      );
    }

    server.ws.send({
      type: "custom",
      event: "kasstor:update",
      data: {
        componentPaths: componentsThatUsedTheUtility.map(c => c.path),
        fileType,
        tags: componentsThatUsedTheUtility.map(c => c.tag),
        operationId,
        debug
      }
    });

    return [];
  }

  // Normalize the file path
  // Check if the file is within the project root
  const relativePath = relative(server.config.root, file);
  const isFileOutsideRoot = relativePath.startsWith("..");

  // If the file is outside the project root (e.g., in node_modules),
  // use the @fs/ prefix so Vite serves it from the filesystem
  const normalizedPath = isFileOutsideRoot
    ? `/@fs${file}`
    : posix.join("/", relativePath);

  // Compute tags based on file type
  const tags: string[] =
    fileType === "scss"
      ? await findReferencingTagsForScss({
          componentDecoratorRegex,
          includedComponentPaths,
          scssPath: file,
          server
        })
      : await findReferencingTagsForComponent({
          componentDecoratorRegex,
          componentPath: file,
          server
        });

  // Check if we should invalidate the next update for all tags. This case can
  // occur when the docs update of the component triggers an extra HMR update,
  // so at the end of the day, the component is updated twice if we don't
  // prevent this case
  if (
    fileType === "component" &&
    tags.every(checkIfShouldInvalidateNextUpdate)
  ) {
    operationTimings.delete(operationId);
    return [];
  }

  server.ws.send({
    type: "custom",
    event: "kasstor:update",
    data: {
      componentPaths: [normalizedPath],
      scssPath: normalizedPath,
      fileType,
      tags,
      operationId,
      debug
    }
  });

  // Return empty array to prevent default HMR behavior (full reload)
  return [];
};

