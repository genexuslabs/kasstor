// Virtual module ID for the HMR client code
export const VIRTUAL_CLIENT_MODULE_ID = "virtual:kasstor-client";
export const RESOLVED_VIRTUAL_CLIENT_MODULE_ID =
  "\0" + VIRTUAL_CLIENT_MODULE_ID;

export const VIRTUAL_CLIENT_HANDLERS_MODULE_ID =
  "virtual:kasstor-client-handlers";
export const RESOLVED_VIRTUAL_CLIENT_HANDLERS_MODULE_ID =
  "\0" + VIRTUAL_CLIENT_HANDLERS_MODULE_ID;

export const DEFAULT_COMPONENT_FILE_PATTERN = /\.lit\.ts$/;
export const DEFAULT_SCSS_FILE_PATTERN = /\.scss$/;
