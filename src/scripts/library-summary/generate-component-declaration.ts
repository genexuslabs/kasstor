import { getComponentEvents } from "./get-component-events-union-type";
import { getComponentProperties } from "./get-component-properties-union-type";
import { getImportPaths } from "./get-import-paths";
import { LibraryComponents } from "./types";

export const getComponentDeclaration = (
  relativeComponentsSrcPath: string,
  components: LibraryComponents
) => `${getImportPaths(relativeComponentsSrcPath, components)}

${getComponentProperties(components)}

${getComponentEvents(components)}`;
