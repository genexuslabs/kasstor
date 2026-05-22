// Side-effect import so that consumers of the package (e.g.
// `@genexus/kasstor-core`) automatically see the ambient `globalThis`
// declarations contributed by this package.
import "./typings/global";

export type { DesignSystemBundleUrl, DesignSystemRegistryOptions } from "./typings/types";

export { fetchStyleSheet } from "./fetch-style-sheet";
export { getLoadedStyleSheet } from "./get-loaded-style-sheet";
export { getStyleSheetPromiseInfo } from "./get-style-sheet-promise-info";
export { registerDesignSystem } from "./register-design-system";
export { setStyleSheetMapping } from "./set-style-sheet-mapping";
