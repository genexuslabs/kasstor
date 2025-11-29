import { describe, expect, test } from "vitest";
import { insertIntoIndex } from "..";

describe("[array]", () => {
  describe("[insertIntoIndex]", () => {
    test("should insert the value in the specific position", () => {
      const dummyArray = ["a", "b", "c"];

      insertIntoIndex(dummyArray, "x", 1);

      expect(dummyArray).toEqual(["a", "x", "b", "c"]);
    });

    test("the first available index should be 0", () => {
      const dummyArray = ["a", "b", "c"];

      insertIntoIndex(dummyArray, "x", 0);

      expect(dummyArray).toEqual(["x", "a", "b", "c"]);
    });
  });
});
