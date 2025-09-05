import { join } from "path";
import { getImportClassName } from "./get-import-class-name";
import { LibraryComponents } from "./types";

const normalizePath = (path: string) => path.replaceAll(/\\/g, "/");

export const getImportPaths = (
  relativeComponentsSrcPath: string,
  components: LibraryComponents
) =>
  components
    .map(
      component =>
        `import type { ${component.className} as ${getImportClassName(component.className)} } from "./${normalizePath(join(relativeComponentsSrcPath, component.srcPath))}";`
    )
    .join("\n");
