import { describe, expect, test } from "vitest";
import { getClientLanguage } from "../index.js";

describe("[getClientLanguage]", () => {
  test.runIf(typeof window === "undefined")(
    "returns default language when window is undefined (server)",
    () => {
      expect(getClientLanguage()).toBe("en");
    }
  );
});
