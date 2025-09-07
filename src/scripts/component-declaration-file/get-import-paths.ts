import {
  ComponentDefinition,
  ComponentImportTypes,
  LibraryComponents
} from "../library-summary/types";
import { getImportClassName } from "./get-import-class-name";

export const sortImports = (modulePathA: string, modulePathB: string) => {
  if (modulePathA.startsWith("./") && !modulePathB.startsWith("./")) {
    return 0;
  }
  if (!modulePathA.startsWith("./") && modulePathB.startsWith("./")) {
    return -1;
  }

  return modulePathA <= modulePathB ? -1 : 0;
};

export const getComponentImport = (component: ComponentDefinition) =>
  `import type { ${component.className} as ${getImportClassName(component.className)} } from "${component.srcPath}";`;

export const getComponentImports = (components: LibraryComponents) =>
  components
    .sort((a, b) => sortImports(a.srcPath, b.srcPath))
    .map(getComponentImport)
    .join("\n");

export const mergeTypeImports = (
  importTypes: ComponentImportTypes,
  typesImportsOnEachModule: Map<string, Set<string>>
) =>
  Object.entries(importTypes).forEach(([modulePath, moduleTypes]) => {
    const moduleImportSet = typesImportsOnEachModule.get(modulePath);

    // If the module path has been already defined by another import type,
    // merge the type imports without duplicating them
    if (moduleImportSet) {
      moduleTypes.forEach(type => moduleImportSet.add(type));
    }
    // Otherwise, create the mapping for the type imports
    else {
      typesImportsOnEachModule.set(modulePath, new Set(moduleTypes));
    }
  });

export const getAllPropertiesEventAndMethodsImports = (
  components: LibraryComponents
) => {
  const typesImportsOnEachModule = new Map<string, Set<string>>();

  components.forEach(component => {
    if (component.propertyImportTypes) {
      mergeTypeImports(component.propertyImportTypes, typesImportsOnEachModule);
    }
    if (component.eventImportTypes) {
      mergeTypeImports(component.eventImportTypes, typesImportsOnEachModule);
    }
    if (component.methodImportTypes) {
      mergeTypeImports(component.methodImportTypes, typesImportsOnEachModule);
    }
  });

  return `${[...typesImportsOnEachModule.entries()]
    .sort((moduleA, moduleB) => sortImports(moduleA[0], moduleB[0]))
    .map(
      ([modulePath, typeImports]) =>
        `import type { ${[...typeImports.values()].join(", ")} } from "${modulePath}";`
    )
    .join("\n")}`;
};

export const getImportPaths = (
  components: LibraryComponents
) => `// Types used by properties, events and methods
${getAllPropertiesEventAndMethodsImports(components)}

// Component class types
${getComponentImports(components)}`;
