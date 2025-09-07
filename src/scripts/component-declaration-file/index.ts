import type { LibraryComponents } from "../library-summary/types";
import { getComponentEvents } from "./get-component-events-union-type";
import { getComponentProperties } from "./get-component-properties-union-type";
import { getImportPaths } from "./get-import-paths";

export const getComponentDeclaration = (
  components: LibraryComponents
) => `${getImportPaths(components)}

${getComponentProperties(components)}

${getComponentEvents(components)}`;
