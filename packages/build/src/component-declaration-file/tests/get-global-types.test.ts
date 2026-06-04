import { describe, expect, it } from "vitest";

import { getGlobalTypeDeclarations } from "../get-global-types.js";
import { makeComponent, makeEvent } from "./fixtures.js";

describe("[component-declaration-file] getGlobalTypeDeclarations", () => {
  it("emits the full event machinery + host interface for a component with events", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        events: [
          makeEvent({
            name: "selectedItemsChange",
            detailType: "SelectedItemsChangeDetail",
            description: "Fires when the selection changes."
          })
        ]
      })
    ];

    const result = getGlobalTypeDeclarations(components);

    // References the imported (aliased) class name, not the raw class name.
    expect(result).toContain("interface HTMLKstFieldElement extends KstFieldElement {");
    // No marker, no prettier-ignore, no @fires.
    expect(result).not.toContain("Auto generated below");
    expect(result).not.toContain("prettier-ignore");
    expect(result).not.toContain("@fires");
    // Event detail type is referenced from the event map.
    expect(result).toContain("selectedItemsChange: SelectedItemsChangeDetail;");
    expect(result).toMatchSnapshot();
  });

  it("emits only a bare host interface for an eventless component", () => {
    const components = [
      makeComponent({
        tagName: "kst-icon",
        className: "KstIcon",
        fullClassJSDoc: "/**\n * An icon.\n */"
      })
    ];

    const result = getGlobalTypeDeclarations(components);

    expect(result).toContain("interface HTMLKstIconElement extends KstIconElement {}");
    // No event machinery for eventless components.
    expect(result).not.toContain("CustomEvent");
    expect(result).not.toContain("EventMap");
    expect(result).not.toContain("addEventListener");
    expect(result).toMatchSnapshot();
  });

  it("wraps every component in a single declare global with merged maps", () => {
    const components = [
      makeComponent({
        tagName: "kst-field",
        className: "KstField",
        fullClassJSDoc: "/**\n * A form field.\n */",
        events: [makeEvent({ name: "change", detailType: "string", description: "Changed." })]
      }),
      makeComponent({
        tagName: "kst-icon",
        className: "KstIcon",
        fullClassJSDoc: "/**\n * An icon.\n */"
      })
    ];

    const result = getGlobalTypeDeclarations(components);

    // A single `declare global` wrapper for the whole library.
    expect(result.match(/declare global/g)).toHaveLength(1);
    // A single merged IntrinsicElements / HTMLElementTagNameMap.
    expect(result.match(/interface IntrinsicElements/g)).toHaveLength(1);
    expect(result.match(/interface HTMLElementTagNameMap/g)).toHaveLength(1);
    expect(result).toMatchSnapshot();
  });
});
