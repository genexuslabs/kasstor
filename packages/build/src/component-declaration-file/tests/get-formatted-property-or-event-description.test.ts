import { describe, expect, it } from "vitest";

import { getFormattedPropertyOrEventDescription } from "../../get-formatted-property-or-event-description.js";

// This helper is the atom that renders the JSDoc block shared by the SolidJS
// property and event representations. Testing it directly gives a single,
// precise signal when its formatting changes (instead of failing every
// property/event snapshot at once). Snapshots are used because the empty
// variants legitimately emit a trailing space after the asterisk.
describe("[component-declaration-file] getFormattedPropertyOrEventDescription", () => {
  it("renders an empty JSDoc body when the description is undefined", () => {
    expect(getFormattedPropertyOrEventDescription(undefined)).toMatchSnapshot();
  });

  it("renders an empty JSDoc body for an empty-string description", () => {
    expect(getFormattedPropertyOrEventDescription("")).toMatchSnapshot();
  });

  it("renders a single-line description", () => {
    expect(getFormattedPropertyOrEventDescription("The current value.")).toMatchSnapshot();
  });

  it("prefixes every line of a multi-line description", () => {
    expect(getFormattedPropertyOrEventDescription("First line.\nSecond line.")).toMatchSnapshot();
  });
});
