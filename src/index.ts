// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                        Decorators
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { Component, SSRLitElement } from "./decorators/Component/index";
export type {
  ComponentOptions,
  ComponentShadowRootOptions
} from "./decorators/Component/types";
export { Event, EventEmitter } from "./decorators/Event/index";
export { Watch } from "./decorators/Watch/index";
export type { WatchOptions } from "./decorators/Watch/types";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                           Other
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { insertIntoIndex, removeIndex } from "./other/array";
export { SyncWithRAF } from "./other/sync-with-frames";

