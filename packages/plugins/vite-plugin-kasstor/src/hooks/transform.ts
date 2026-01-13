import { transformPrivateFieldsToPublic } from "../internal/transform-private-fields.js";

const PRIVATE_FIELD_REGEX = /#[a-zA-Z_$][a-zA-Z0-9_$]*/;

/**
 * Transform source code to replace private fields with public fields in dev mode.
 *
 * Only applies in dev server.
 */
export const transform = (options: {
  code: string;
  hmrForComponent: boolean;
  isDevServer: boolean;
}) => {
  const { code, hmrForComponent, isDevServer } = options;

  // Only works for dev server
  if (!hmrForComponent || !isDevServer) {
    return null;
  }

  // Check if the code contains private fields
  if (!PRIVATE_FIELD_REGEX.test(code)) {
    return null;
  }

  const transformed = transformPrivateFieldsToPublic(code);

  if (transformed === code) {
    return null;
  }

  return {
    code: transformed,
    map: null
  };
};

