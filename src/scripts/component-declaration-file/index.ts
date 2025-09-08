import type { LibraryComponents } from "../library-summary/types";
import { getComponentEvents } from "./get-component-events-union-type";
import {
  getComponentProperties,
  getComponentPropertiesSolidJS
} from "./get-component-properties-union-type";
import { getImportPaths } from "./get-import-paths";
import {
  getLocalJSXTypes,
  getReactModuleTypes,
  getSolidJsModuleTypes,
  getSolidJsTypes,
  getStencilJsModuleTypes
} from "./get-local-jsx-types";

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
//   export class MyElement extends SSRLitElement {}
//`
    : `${getImportPaths(components)}

${getComponentProperties(components)}

${getComponentPropertiesSolidJS(components)}

${getComponentEvents(components, "nothing")}
${getLocalJSXTypes(components)}
${getSolidJsTypes(components)}
${getReactModuleTypes()}
${getSolidJsModuleTypes()}
${getStencilJsModuleTypes()}`;

