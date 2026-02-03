// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                        Decorators
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { Component, KasstorElement } from "./decorators/Component/index.js";
export type {
  ComponentOptions,
  ComponentShadowRootOptions
} from "./decorators/Component/types";
export { Event, EventEmitter } from "./decorators/Event/index.js";
export { Observe } from "./decorators/Observe/index.js";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                        Directives
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  renderByPlatform,
  type RenderByPlatformDirective
} from "./directives/render-by-platform/index.js";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                           Types
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type * from "./typings/global";

