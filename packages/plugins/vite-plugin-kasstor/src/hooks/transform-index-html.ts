import { VIRTUAL_MODULE_ID } from "../constants.js";

/**
 * Transform the HTML to import our virtual module(s).
 *
 * Only applies in dev server.
 */
export const transformIndexHtml = (isDevServer: boolean) => {
  // Only works for dev server
  if (!isDevServer) {
    return undefined;
  }

  return [
    {
      tag: "script",
      attrs: { type: "module", src: `/@id/__x00__${VIRTUAL_MODULE_ID}` },
      injectTo: "head-prepend"
    } as const
  ];
};

