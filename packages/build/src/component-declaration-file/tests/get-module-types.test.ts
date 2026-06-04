import { describe, expect, it } from "vitest";

import {
  getReactModuleTypes,
  getSolidJsModuleTypes,
  getStencilJsModuleTypes
} from "../get-local-jsx-types.js";

// These three augmentations are static (they take no arguments). React and
// StencilJS reuse the `LocalJSX` IntrinsicElements; only SolidJS uses
// `SolidJsJSX`.
describe("[component-declaration-file] framework module augmentations", () => {
  it("augments the `react` module with LocalJSX.IntrinsicElements", () => {
    expect(getReactModuleTypes()).toMatchSnapshot();
  });

  it("augments the `solid-js` module with SolidJsJSX.IntrinsicElements", () => {
    expect(getSolidJsModuleTypes()).toMatchSnapshot();
  });

  it("augments the `@stencil/core` module with LocalJSX.IntrinsicElements", () => {
    expect(getStencilJsModuleTypes()).toMatchSnapshot();
  });
});
