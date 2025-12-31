import { posix, relative } from "path";
import { styleText } from "util";
import type { HmrContext } from "vite";
import { findReferencingTags } from "../internal/find-referencing-tags.js";
import { prettyTimeMark } from "../internal/pretty-time-mark.js";

/**
 * Map to track operation start times for performance metrics
 * operationId -> startTime (in milliseconds)
 */
const operationTimings = new Map<string, number>();

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

  // Normalize the file path
  const normalizedPath = posix.join("/", relative(server.config.root, file));

  // Generate a unique operation ID for tracking performance metrics
  const operationId = `${fileType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Record the start time for this operation
  const startTime = performance.now();
  if (operationTimings) {
    operationTimings.set(operationId, startTime);
  }

  // Compute tags when scss changed
  let tags: string[] = [];
  if (fileType === "scss") {
    tags = await findReferencingTags({
      componentFilePattern,
      scssPath: file,
      server
    });
  }

  server.ws.send({
    type: "custom",
    event: "lit-refresh:update",
    data: {
      file: normalizedPath,
      fileType,
      tags,
      timestamp: startTime,
      operationId,
      debug
    }
  });

  // Listen for performance metrics from the client
  server.ws.on("custom:lit-refresh:performance", (data: unknown) => {
    const message = data as {
      operationId?: string;
      operationType?: string;
      components?: string[];
    };
    const { components, operationId, operationType } = message;

    if (!operationId || !components) {
      return;
    }

    // Calculate elapsed time from when the operation started
    const startTime = operationTimings.get(operationId);

    if (startTime) {
      const elapsedTime = performance.now() - startTime;

      server.config.logger.info(
        styleText("dim", "[kasstor] ") +
          `updated ${operationType}: ` +
          styleText("cyan", components.join(", ")) +
          styleText("dim", ` in ${prettyTimeMark(elapsedTime)}`)
      );

      // Clean up the timing entry
      operationTimings.delete(operationId);
    }
  });

  // Return empty array to prevent default HMR behavior (full reload)
  return [];
};

