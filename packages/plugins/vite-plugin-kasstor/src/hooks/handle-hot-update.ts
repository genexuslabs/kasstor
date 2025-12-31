import { posix, relative } from "path";
import type { HmrContext, ViteDevServer } from "vite";
import { findReferencingTagsForComponent } from "../internal/find-referencing-tags-for-component.js";
import { findReferencingTagsForScss } from "../internal/find-referencing-tags-for-scss.js";
import { getStringForLogger } from "../internal/get-string-for-logger.js";
import { checkIfShouldInvalidateNextUpdate } from "../internal/invalidate-next-hmr-for-component.js";

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
      operationType: string;
      components: string[];
    };
    const { components, operationId, operationType } = message;

    // Calculate elapsed time from when the operation started
    const startTime = operationTimings.get(operationId);

    if (startTime) {
      const elapsedTime = performance.now() - startTime;

      server.config.logger.info(
        getStringForLogger(operationType, components, elapsedTime)
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
  ctx: HmrContext;
  componentFilePattern: RegExp;
  debug: boolean | undefined;
  getFileType: (filePath: string) => "unknown" | "component" | "scss";
  hmrForComponent: boolean;
  hmrForStyles: boolean;
}) => {
  const {
    ctx,
    componentFilePattern,
    debug,
    getFileType,
    hmrForComponent,
    hmrForStyles
  } = options;
  const { file, server } = ctx;

  const hmrIsDisabled = !hmrForComponent && !hmrForStyles;
  const fileType = getFileType(file);

  if (hmrIsDisabled || fileType === "unknown") {
    // Let Vite handle other files normally
    return undefined;
  }

  if (
    (fileType === "component" && !hmrForComponent) ||
    (fileType === "scss" && !hmrForStyles)
  ) {
    // Let Vite handle other files normally
    return undefined;
  }

  // Listen for performance metrics from the client
  registerListenerForPerformanceMetrics(server);

  // Normalize the file path
  const normalizedPath = posix.join("/", relative(server.config.root, file));

  // Generate a unique operation ID for tracking performance metrics
  const operationId = `${fileType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Record the start time for this operation
  operationTimings.set(operationId, performance.now());

  // Compute tags based on file type
  const tags: string[] =
    fileType === "scss"
      ? await findReferencingTagsForScss({
          componentFilePattern,
          scssPath: file,
          server
        })
      : await findReferencingTagsForComponent({
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
      file: normalizedPath,
      fileType,
      tags,
      operationId,
      debug
    }
  });

  // Return empty array to prevent default HMR behavior (full reload)
  return [];
};

