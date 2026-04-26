export { buildLibrary } from "./build-library.js";
export { loadLibrarySummary } from "./library-summary/load-library-summary.js";
export type {
  LoadedLibrarySummary,
  LoadLibrarySummaryOptions
} from "./library-summary/load-library-summary.js";

export type * from "./typings/build-options.js";
export type {
  KasstorBuildComponentData,
  KasstorBuildOptions
} from "./typings/build-options.js";

// Re-export the canonical component-IR types so external tooling (e.g.
// `@genexus/kasstor-lit-analyzer`) can depend on a single source of truth.
export type {
  ComponentDefinition,
  ComponentDefinitionCssVariable,
  ComponentDefinitionCssVariables,
  ComponentDefinitionEvent,
  ComponentDefinitionEvents,
  ComponentDefinitionMethod,
  ComponentDefinitionMethods,
  ComponentDefinitionPart,
  ComponentDefinitionParts,
  ComponentDefinitionProperties,
  ComponentDefinitionProperty,
  ComponentDefinitionSlot,
  ComponentDefinitionSlots,
  ComponentImportTypes,
  LibraryComponents
} from "./typings/library-components.js";

export { AUTO_GENERATED_MARKER } from "./global-type-declarations/constants.js";

