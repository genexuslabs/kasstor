import { afterEach, beforeEach, describe, test } from "vitest";

describe.skip("[directives]", () => {
  describe("[watch + repeat]", () => {
    describe("[signals outside the component]", () => {
      beforeEach(() => {
        // renderCount = 0;
        // count(0);
      });

      afterEach(() => {
        // Cleanup the DOM. Since we are not using the render from
        // vitest-browser-lit, we must do it "manually"
        document.body.innerHTML = "";
      });

      test.todo("should work with repeat");
    });
  });
});

