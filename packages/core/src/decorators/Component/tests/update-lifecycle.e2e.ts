// Tests around the DOM produced by a Kasstor component as it goes through
// reactive updates: property changes, attribute reflection, conditional
// rendering, list rendering, render batching, and the `firstWillUpdate`
// once-only guarantee.

import type { PropertyValues } from "lit";
import { property } from "lit/decorators/property.js";
import { html } from "lit/html.js";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement } from "../index.js";

// ---------------------------------------------------------------------------
// Component classes
// ---------------------------------------------------------------------------

@Component({ tag: "update-text-prop" })
class UpdateTextProp extends KasstorElement {
  /** Text rendered inside the shadow root. */
  @property() text: string = "initial";

  override render() {
    return html`<p data-text>${this.text}</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "update-text-prop": UpdateTextProp;
  }
}

@Component({ tag: "update-attribute-reflect" })
class UpdateAttributeReflect extends KasstorElement {
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  override render() {
    return html`<button ?disabled=${this.disabled}>btn</button>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "update-attribute-reflect": UpdateAttributeReflect;
  }
}

@Component({ tag: "update-conditional-render" })
class UpdateConditionalRender extends KasstorElement {
  @property({ type: Boolean }) showA: boolean = true;

  override render() {
    return this.showA
      ? html`<p data-branch="a">branch-a</p>`
      : html`<p data-branch="b">branch-b</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "update-conditional-render": UpdateConditionalRender;
  }
}

@Component({ tag: "update-list-render" })
class UpdateListRender extends KasstorElement {
  @property({ attribute: false }) items: string[] = ["a", "b", "c"];

  override render() {
    return html`<ul>
      ${this.items.map(it => html`<li data-item="${it}">${it}</li>`)}
    </ul>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "update-list-render": UpdateListRender;
  }
}

@Component({ tag: "update-batched-renders" })
class UpdateBatchedRenders extends KasstorElement {
  @property() a: string = "a0";
  @property() b: string = "b0";
  @property() c: string = "c0";

  renderCallCount = 0;

  override render() {
    this.renderCallCount++;
    return html`<p>${this.a}-${this.b}-${this.c}</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "update-batched-renders": UpdateBatchedRenders;
  }
}

@Component({ tag: "update-firstwillupdate-once" })
class UpdateFirstWillUpdateOnce extends KasstorElement {
  @property() value: string = "v0";

  firstWillUpdateCalls = 0;
  willUpdateCalls = 0;

  protected override firstWillUpdate(_changed: PropertyValues): void {
    this.firstWillUpdateCalls++;
  }
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.willUpdateCalls++;
  }
  override render() {
    return html`<p>${this.value}</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "update-firstwillupdate-once": UpdateFirstWillUpdateOnce;
  }
}

@Component({ tag: "update-no-shadow", shadow: false })
class UpdateNoShadow extends KasstorElement {
  @property() label: string = "first";

  override render() {
    return html`<p data-light-text>${this.label}</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "update-no-shadow": UpdateNoShadow;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[update lifecycle: DOM after property/attribute changes]", () => {
      afterEach(() => cleanup());

      test("changing a `@property` re-renders and the new text appears in the DOM", async () => {
        render(html`<update-text-prop></update-text-prop>`);
        const element = document.querySelector("update-text-prop")! as UpdateTextProp;
        await element.updateComplete;

        expect(element.shadowRoot!.querySelector("[data-text]")!.textContent).toBe("initial");

        element.text = "updated";
        await element.updateComplete;

        expect(element.shadowRoot!.querySelector("[data-text]")!.textContent).toBe("updated");
      });

      test("setting an attribute on the host reflects into the property and re-renders", async () => {
        render(html`<update-text-prop text="from-attribute"></update-text-prop>`);
        const element = document.querySelector("update-text-prop")! as UpdateTextProp;
        await element.updateComplete;

        expect(element.text).toBe("from-attribute");
        expect(element.shadowRoot!.querySelector("[data-text]")!.textContent).toBe(
          "from-attribute"
        );

        element.setAttribute("text", "via-set-attribute");
        await element.updateComplete;
        expect(element.shadowRoot!.querySelector("[data-text]")!.textContent).toBe(
          "via-set-attribute"
        );
      });

      test("`reflect: true` property writes the attribute back on the host and toggles it on update", async () => {
        render(html`<update-attribute-reflect></update-attribute-reflect>`);
        const element = document.querySelector(
          "update-attribute-reflect"
        )! as UpdateAttributeReflect;
        await element.updateComplete;

        expect(element.hasAttribute("disabled")).toBe(false);
        expect(element.shadowRoot!.querySelector("button")!.hasAttribute("disabled")).toBe(false);

        element.disabled = true;
        await element.updateComplete;

        expect(element.hasAttribute("disabled")).toBe(true);
        expect(element.shadowRoot!.querySelector("button")!.hasAttribute("disabled")).toBe(true);

        element.disabled = false;
        await element.updateComplete;

        expect(element.hasAttribute("disabled")).toBe(false);
        expect(element.shadowRoot!.querySelector("button")!.hasAttribute("disabled")).toBe(false);
      });

      test("conditional template swaps branches when the controlling property flips", async () => {
        render(html`<update-conditional-render></update-conditional-render>`);
        const element = document.querySelector(
          "update-conditional-render"
        )! as UpdateConditionalRender;
        await element.updateComplete;

        expect(element.shadowRoot!.querySelector("[data-branch='a']")).not.toBeNull();
        expect(element.shadowRoot!.querySelector("[data-branch='b']")).toBeNull();

        element.showA = false;
        await element.updateComplete;

        expect(element.shadowRoot!.querySelector("[data-branch='a']")).toBeNull();
        expect(element.shadowRoot!.querySelector("[data-branch='b']")).not.toBeNull();
      });

      test("list property: items are added, removed, and reordered in the DOM as the array changes", async () => {
        render(html`<update-list-render></update-list-render>`);
        const element = document.querySelector("update-list-render")! as UpdateListRender;
        await element.updateComplete;

        const itemsFromDom = () =>
          Array.from(element.shadowRoot!.querySelectorAll("li")).map(
            li => li.getAttribute("data-item")!
          );

        expect(itemsFromDom()).toEqual(["a", "b", "c"]);

        // Add an item
        element.items = [...element.items, "d"];
        await element.updateComplete;
        expect(itemsFromDom()).toEqual(["a", "b", "c", "d"]);

        // Remove an item
        element.items = element.items.filter(x => x !== "b");
        await element.updateComplete;
        expect(itemsFromDom()).toEqual(["a", "c", "d"]);

        // Reorder
        element.items = [...element.items].reverse();
        await element.updateComplete;
        expect(itemsFromDom()).toEqual(["d", "c", "a"]);

        // Empty
        element.items = [];
        await element.updateComplete;
        expect(itemsFromDom()).toEqual([]);
      });

      test("multiple property changes in the same task batch into a single render", async () => {
        render(html`<update-batched-renders></update-batched-renders>`);
        const element = document.querySelector("update-batched-renders")! as UpdateBatchedRenders;
        await element.updateComplete;

        const renderCountAfterFirst = element.renderCallCount;
        expect(renderCountAfterFirst).toBe(1);
        expect(element.shadowRoot!.querySelector("p")!.textContent).toBe("a0-b0-c0");

        // All three properties change synchronously — Lit must batch them into one render.
        element.a = "a1";
        element.b = "b1";
        element.c = "c1";

        await element.updateComplete;

        expect(element.renderCallCount).toBe(renderCountAfterFirst + 1);
        expect(element.shadowRoot!.querySelector("p")!.textContent).toBe("a1-b1-c1");
      });

      test("firstWillUpdate runs once, regardless of how many subsequent updates happen", async () => {
        render(html`<update-firstwillupdate-once></update-firstwillupdate-once>`);
        const element = document.querySelector(
          "update-firstwillupdate-once"
        )! as UpdateFirstWillUpdateOnce;
        await element.updateComplete;

        expect(element.firstWillUpdateCalls).toBe(1);
        expect(element.willUpdateCalls).toBe(1);

        element.value = "v1";
        await element.updateComplete;
        element.value = "v2";
        await element.updateComplete;
        element.value = "v3";
        await element.updateComplete;

        expect(element.firstWillUpdateCalls).toBe(1);
        expect(element.willUpdateCalls).toBe(4);
      });

      test("firstWillUpdate is NOT called again when the element is removed from the DOM and re-attached", async () => {
        render(html`<update-firstwillupdate-once></update-firstwillupdate-once>`);
        const element = document.querySelector(
          "update-firstwillupdate-once"
        )! as UpdateFirstWillUpdateOnce;
        const parent = element.parentElement!;
        await element.updateComplete;

        expect(element.firstWillUpdateCalls).toBe(1);

        element.remove();
        parent.appendChild(element);
        await element.updateComplete;

        // Reconnecting fires connectedCallback again but NOT firstWillUpdate
        expect(element.firstWillUpdateCalls).toBe(1);
      });

      test("shadow: false — property change re-renders into the light DOM (no shadow root)", async () => {
        render(html`<update-no-shadow></update-no-shadow>`);
        const element = document.querySelector("update-no-shadow")! as UpdateNoShadow;
        await element.updateComplete;

        expect(element.shadowRoot).toBeNull();
        expect(element.querySelector("[data-light-text]")!.textContent).toBe("first");

        element.label = "second";
        await element.updateComplete;
        expect(element.querySelector("[data-light-text]")!.textContent).toBe("second");

        element.label = "third";
        await element.updateComplete;
        expect(element.querySelector("[data-light-text]")!.textContent).toBe("third");
      });

      test("setting a property to its current value does not produce a re-render", async () => {
        render(html`<update-batched-renders></update-batched-renders>`);
        const element = document.querySelector("update-batched-renders")! as UpdateBatchedRenders;
        await element.updateComplete;

        const renderCountAfterFirst = element.renderCallCount;
        expect(renderCountAfterFirst).toBe(1);

        // Assigning the same value should NOT mark the element dirty.
        element.a = element.a;
        element.b = element.b;
        await element.updateComplete;

        expect(element.renderCallCount).toBe(renderCountAfterFirst);
      });
    });
  });
});
