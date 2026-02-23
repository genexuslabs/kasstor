import { describe, expect, test } from "vitest";
import { setInitialApplicationLanguage } from "../index.js";

describe("[setInitialApplicationLanguage] (server)", () => {
  test.runIf(typeof window === "undefined")(
    "throws when pathname is undefined and window is undefined (server)",
    () => {
      expect(() =>
        setInitialApplicationLanguage({
          locationChangeCallback: () => {},
          pathname: undefined
        })
      ).toThrow(
        '"setInitialApplicationLanguage" requires a pathname when called in the server'
      );
    }
  );
});
