import { afterEach, describe, expect, test } from "vitest";
import { getClientLanguage } from "../index.js";

const resetGlobals = () => {
  delete (globalThis as unknown as { kasstorWebkitI18n?: unknown }).kasstorWebkitI18n;
};

describe("[getClientLanguage]", () => {
  afterEach(() => {
    resetGlobals();
  });

  test.runIf(typeof window === "undefined")(
    "returns default language when window is undefined (server)",
    () => {
      expect(getClientLanguage()).toBe("en");
    }
  );

  test.runIf(typeof window === "undefined")(
    "uses configuredDefaultLanguage when set on the server",
    () => {
      // Initialize globals first.
      getClientLanguage();
      kasstorWebkitI18n!.configuredDefaultLanguage = "es";
      expect(getClientLanguage()).toBe("es");
    }
  );
});
