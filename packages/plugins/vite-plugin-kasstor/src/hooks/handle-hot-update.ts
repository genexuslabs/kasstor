import { posix, relative } from "path";
import type { HmrContext } from "vite";
import { findReferencingTags } from "../internal/find-referencing-tags.js";

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
      timestamp: Date.now(),
      debug
    }
  });

  // Return empty array to prevent default HMR behavior (full reload)
  return [];
};

