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
//                        Components
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// The `kst-theme` custom element is registered as a side effect of its own
// module — it is exposed via the `./components/theme.js` subpath export so
// that consumers can opt in to its bundle cost only when they need it.
export { getBundles } from "./components/theme/get-bundles.js";
export type { ThemeItemModel, ThemeModel } from "./components/theme/types";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//                           Types
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type * from "./typings/global";

