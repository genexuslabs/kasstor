import type { LibraryComponents } from "../typings/library-components";
import { getComponentEvents } from "./get-component-events-union-type.js";
import {
  getComponentBaseClass,
  getComponentProperties
} from "./get-component-properties-union-type.js";
import { getGlobalTypeDeclarations } from "./get-global-types.js";
import { getImportPaths } from "./get-import-paths.js";

/**
 * Builds the content of the core (framework-agnostic) types file (e.g.
 * `components.ts`).
 *
 * This file contains everything that does NOT depend on a specific framework:
 * the imports/re-exports of the types used by properties, events and methods,
 * the `ComponentBaseClasses` interface, the `ComponentProperties` namespace, the
 * `ComponentEvents` namespace, and the `declare global` block with the
 * custom-element element types (event maps, typed listeners,
 * `HTMLElementTagNameMap`, etc.). The latter used to be appended at the end of
 * each `*.lit.ts` file and now lives here.
 *
 * The `ComponentPropertiesReact` and `ComponentPropertiesSolidJS` namespaces are
 * NOT generated here: they are only used by the React / SolidJS JSX files and,
 * unlike `ComponentProperties` (a `Pick<>` of the imported class, still used by
 * the StencilJS file), they re-declare each prop and so do not depend on this
 * file's class imports. They are generated inside their respective framework
 * files instead.
 *
 * The per-framework JSX types (React/SolidJS/StencilJS) live in their own opt-in
 * files (see `get-framework-types.ts`) so that consumers only pull in a given
 * framework's typings when they actually use it.
 */
export const getComponentDeclaration = (components: LibraryComponents) =>
  components.length === 0
    ? `//
// No "public" components were found. Only "public" components are exported.
// To mark a component as "public", add the "@public" (or "@access public") tag in the JSDoc of the component class.
//
// Example:
//   /**
//    * Component description...
//    * @public
//    */
//   @Component({
//     styles,
//     tag: "my-element"
//   })
//   export class MyElement extends KasstorElement {}
//`
    : `${getImportPaths(components)}

${getComponentBaseClass(components)}

${getComponentProperties(components)}

${getComponentEvents(components, "nothing")}

${getGlobalTypeDeclarations(components)}`;

export {
  getReactDeclaration,
  getSolidDeclaration,
  getStencilDeclaration
} from "./get-framework-types.js";
