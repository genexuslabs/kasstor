import { html } from "lit/html.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, render } from "vitest-browser-lit";
import { Component, KasstorElement, type ComponentOptions } from "../index.js";

/**
 * Type used in tests to read the protected `kstMetadata` without casting to
 * `any`.
 */
interface ElementWithKstMetadata<T = unknown> {
  kstMetadata: T | undefined;
}

/** Casts an element to ElementWithKstMetadata for tests (kstMetadata is protected). */
function withKstMetadata<T = unknown>(element: unknown): ElementWithKstMetadata<T> {
  return element as ElementWithKstMetadata<T>;
}

// --- Components without metadata ---

@Component({ tag: "metadata-test-no-meta" })
class MetadataTestNoMeta extends KasstorElement {
  override render() {
    return html`<p>no-meta</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-no-meta": MetadataTestNoMeta;
  }
}

// --- Components with object metadata ---

const objectMeta = { version: 1, name: "test" };

@Component({ tag: "metadata-test-object", metadata: objectMeta })
class MetadataTestObject extends KasstorElement<typeof objectMeta> {
  override render() {
    return html`<p>object</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-object": MetadataTestObject;
  }
}

// --- Components with primitive metadata ---

@Component({ tag: "metadata-test-string", metadata: "simple" })
class MetadataTestString extends KasstorElement<string> {
  override render() {
    return html`<p>string</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-string": MetadataTestString;
  }
}

@Component({ tag: "metadata-test-number", metadata: 42 })
class MetadataTestNumber extends KasstorElement<number> {
  override render() {
    return html`<p>number</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-number": MetadataTestNumber;
  }
}

// --- Component with typed metadata (for advanced tests) ---

type ButtonMetadata = { variant: "primary" | "secondary"; role: string };

@Component({
  tag: "metadata-test-typed",
  metadata: { variant: "primary", role: "button" }
})
class MetadataTestTyped extends KasstorElement<ButtonMetadata> {
  override render() {
    const meta = this.kstMetadata;
    const variant = meta?.variant ?? "primary";
    const role = meta?.role ?? "button";
    return html`<p data-variant="${variant}" data-role="${role}">typed</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-typed": MetadataTestTyped;
  }
}

// --- Component that behaves differently based on metadata ---

type ThemeMetadata = { theme: "light" | "dark" };

@Component({
  tag: "metadata-test-theme",
  metadata: { theme: "dark" }
})
class MetadataTestTheme extends KasstorElement<ThemeMetadata> {
  override render() {
    const theme = this.kstMetadata?.theme ?? "light";
    return html`<p class="theme-${theme}">${theme}</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-theme": MetadataTestTheme;
  }
}

@Component({
  tag: "metadata-test-theme-light",
  metadata: { theme: "light" }
})
class MetadataTestThemeLight extends KasstorElement<ThemeMetadata> {
  override render() {
    const theme = this.kstMetadata?.theme ?? "light";
    return html`<p class="theme-${theme}">${theme}</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-theme-light": MetadataTestThemeLight;
  }
}

// --- Component with null/empty-like metadata for edge cases ---

@Component({ tag: "metadata-test-empty-object", metadata: {} })
class MetadataTestEmptyObject extends KasstorElement<Record<string, never>> {
  override render() {
    return html`<p>empty</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-empty-object": MetadataTestEmptyObject;
  }
}

// --- Component for firstWillUpdate metadata test ---

type InitMeta = { initialized: boolean };
let capturedMetaInFirstWillUpdate: InitMeta | undefined;

@Component({
  tag: "metadata-test-first-will-update",
  metadata: { initialized: true }
})
class MetadataTestFirstWillUpdate extends KasstorElement<InitMeta> {
  protected override firstWillUpdate(): void {
    capturedMetaInFirstWillUpdate = this.kstMetadata;
  }

  override render() {
    return html`<p>ok</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-first-will-update": MetadataTestFirstWillUpdate;
  }
}

// --- Components for lifecycle metadata tests (connectedCallback, willUpdate, firstUpdated) ---

type LifecycleMeta = { source: string };
let capturedMetaInConnectedCallback: LifecycleMeta | undefined;
let capturedMetaInWillUpdate: LifecycleMeta | undefined;
let capturedMetaInFirstUpdated: LifecycleMeta | undefined;

@Component({
  tag: "metadata-test-lifecycle",
  metadata: { source: "lifecycle" }
})
class MetadataTestLifecycle extends KasstorElement<LifecycleMeta> {
  override connectedCallback(): void {
    super.connectedCallback();
    capturedMetaInConnectedCallback = this.kstMetadata;
  }

  protected override willUpdate(): void {
    capturedMetaInWillUpdate = this.kstMetadata;
  }

  override firstUpdated(): void {
    capturedMetaInFirstUpdated = this.kstMetadata;
  }

  override render() {
    return html`<p>lifecycle</p>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "metadata-test-lifecycle": MetadataTestLifecycle;
  }
}

// --- Custom extend pattern (similar to advanced-examples/custom-extend) ---
// A custom base element that uses metadata to conditionally behave; components
// use @Component and extend this base (like LibraryComponent + LibraryElement).

type ExtendedMetadata = { featureId: "alpha" | "beta" };

abstract class ExtendedElement<Metadata extends ExtendedMetadata> extends KasstorElement<Metadata> {
  /** Uses kstMetadata to drive conditional behavior (like featureId in LibraryElement). */
  protected get featureId(): Metadata["featureId"] {
    return this.kstMetadata?.featureId ?? "alpha";
  }

  override render() {
    const id = this.featureId;
    return html`<p data-feature-id="${id}">${id}</p>`;
  }
}

const extendedAlphaMeta = { featureId: "alpha" } as const;
const extendedBetaMeta = { featureId: "beta" } as const;

/** Custom decorator that wraps Component and requires metadata (like LibraryComponent). */
function ExtendedComponent<Metadata extends ExtendedMetadata>(
  options: ComponentOptions<"extended-", Metadata> & { metadata: Metadata }
) {
  return Component(options) as <T extends typeof ExtendedElement<Metadata>>(target: T) => T | void;
}

@Component({
  tag: "extended-alpha",
  metadata: extendedAlphaMeta
})
class ExtendedAlphaElement extends ExtendedElement<typeof extendedAlphaMeta> {}
declare global {
  interface HTMLElementTagNameMap {
    "extended-alpha": ExtendedAlphaElement;
  }
}

@Component({
  tag: "extended-beta",
  metadata: extendedBetaMeta
})
class ExtendedBetaElement extends ExtendedElement<typeof extendedBetaMeta> {}
declare global {
  interface HTMLElementTagNameMap {
    "extended-beta": ExtendedBetaElement;
  }
}

@ExtendedComponent({
  tag: "extended-gamma",
  metadata: { featureId: "beta" }
})
class ExtendedGammaElement extends ExtendedElement<typeof extendedBetaMeta> {}
declare global {
  interface HTMLElementTagNameMap {
    "extended-gamma": ExtendedGammaElement;
  }
}

describe("[Decorator]", () => {
  describe("[Component]", () => {
    describe("[kstMetadata]", () => {
      afterEach(() => cleanup());

      beforeEach(() => {
        capturedMetaInFirstWillUpdate = undefined;
        capturedMetaInConnectedCallback = undefined;
        capturedMetaInWillUpdate = undefined;
        capturedMetaInFirstUpdated = undefined;
      });

      describe("happy path: metadata is set and readable", () => {
        test("component without metadata option has kstMetadata undefined", async () => {
          render(html`<metadata-test-no-meta></metadata-test-no-meta>`);
          const element = document.querySelector("metadata-test-no-meta")! as MetadataTestNoMeta;
          await element.updateComplete;

          expect(withKstMetadata(element).kstMetadata).toBeUndefined();
        });

        test("component with object metadata returns the same reference", async () => {
          render(html`<metadata-test-object></metadata-test-object>`);
          const element = document.querySelector("metadata-test-object")! as MetadataTestObject;
          await element.updateComplete;

          const meta = withKstMetadata<typeof objectMeta>(element).kstMetadata;
          expect(meta).toBe(objectMeta);
          expect(meta).toEqual({ version: 1, name: "test" });
        });

        test("component with string metadata returns the value", async () => {
          render(html`<metadata-test-string></metadata-test-string>`);
          const element = document.querySelector("metadata-test-string")! as MetadataTestString;
          await element.updateComplete;

          expect(withKstMetadata<string>(element).kstMetadata).toBe("simple");
        });

        test("component with number metadata returns the value", async () => {
          render(html`<metadata-test-number></metadata-test-number>`);
          const element = document.querySelector("metadata-test-number")! as MetadataTestNumber;
          await element.updateComplete;

          expect(withKstMetadata<number>(element).kstMetadata).toBe(42);
        });

        test("component with empty object metadata returns the object", async () => {
          render(html`<metadata-test-empty-object></metadata-test-empty-object>`);
          const element = document.querySelector(
            "metadata-test-empty-object"
          )! as MetadataTestEmptyObject;
          await element.updateComplete;

          expect(withKstMetadata<Record<string, never>>(element).kstMetadata).toEqual({});
        });
      });

      describe("edge cases: read-only and access", () => {
        test("assigning to kstMetadata throws (getter-only, no setter)", async () => {
          render(html`<metadata-test-object></metadata-test-object>`);
          const element = document.querySelector("metadata-test-object")! as MetadataTestObject;
          await element.updateComplete;

          expect(() => {
            withKstMetadata(element).kstMetadata = { other: true };
          }).toThrow();
          expect(withKstMetadata<typeof objectMeta>(element).kstMetadata).toBe(objectMeta);
        });

        test("multiple instances share the same metadata reference from decorator", async () => {
          render(html`
            <metadata-test-object></metadata-test-object>
            <metadata-test-object></metadata-test-object>
          `);
          const first = document.querySelector("metadata-test-object")! as MetadataTestObject;
          const second = document.querySelectorAll(
            "metadata-test-object"
          )[1]! as MetadataTestObject;
          await first.updateComplete;
          await second.updateComplete;

          const firstMeta = withKstMetadata<typeof objectMeta>(first).kstMetadata;
          const secondMeta = withKstMetadata<typeof objectMeta>(second).kstMetadata;
          expect(firstMeta).toBe(secondMeta);
          expect(firstMeta).toBe(objectMeta);
        });

        test("after failed assign, kstMetadata still returns original value", async () => {
          render(html`<metadata-test-number></metadata-test-number>`);
          const element = document.querySelector("metadata-test-number")! as MetadataTestNumber;
          await element.updateComplete;

          try {
            withKstMetadata<number>(element).kstMetadata = 99;
          } catch {
            // expected
          }
          expect(withKstMetadata<number>(element).kstMetadata).toBe(42);
        });
      });

      describe("advanced: component behavior based on metadata", () => {
        test("typed metadata is used in render (variant and role)", async () => {
          render(html`<metadata-test-typed></metadata-test-typed>`);
          const element = document.querySelector("metadata-test-typed")! as MetadataTestTyped;
          await element.updateComplete;

          const p = element.shadowRoot!.querySelector("p")!;
          expect(p.getAttribute("data-variant")).toBe("primary");
          expect(p.getAttribute("data-role")).toBe("button");
        });

        test("component with theme metadata dark renders with theme-dark class", async () => {
          render(html`<metadata-test-theme></metadata-test-theme>`);
          const element = document.querySelector("metadata-test-theme")! as MetadataTestTheme;
          await element.updateComplete;

          const p = element.shadowRoot!.querySelector("p")!;
          expect(p.className).toBe("theme-dark");
          expect(p.textContent?.trim()).toBe("dark");
        });

        test("component with theme metadata light renders with theme-light class", async () => {
          render(html`<metadata-test-theme-light></metadata-test-theme-light>`);
          const element = document.querySelector(
            "metadata-test-theme-light"
          )! as MetadataTestThemeLight;
          await element.updateComplete;

          const p = element.shadowRoot!.querySelector("p")!;
          expect(p.className).toBe("theme-light");
          expect(p.textContent?.trim()).toBe("light");
        });

        test("metadata is available in firstWillUpdate for initial setup", async () => {
          render(html`<metadata-test-first-will-update></metadata-test-first-will-update>`);
          const element = document.querySelector("metadata-test-first-will-update")!;
          await element.updateComplete;

          expect(capturedMetaInFirstWillUpdate).toEqual({ initialized: true });
        });
      });

      describe("metadata available in lifecycle callbacks", () => {
        test("metadata is available in connectedCallback", async () => {
          render(html`<metadata-test-lifecycle></metadata-test-lifecycle>`);
          const element = document.querySelector("metadata-test-lifecycle")!;
          await element.updateComplete;

          expect(capturedMetaInConnectedCallback).toEqual({ source: "lifecycle" });
        });

        test("metadata is available in willUpdate", async () => {
          render(html`<metadata-test-lifecycle></metadata-test-lifecycle>`);
          const element = document.querySelector("metadata-test-lifecycle")!;
          await element.updateComplete;

          expect(capturedMetaInWillUpdate).toEqual({ source: "lifecycle" });
        });

        test("metadata is available in firstUpdated", async () => {
          render(html`<metadata-test-lifecycle></metadata-test-lifecycle>`);
          const element = document.querySelector("metadata-test-lifecycle")!;
          await element.updateComplete;

          expect(capturedMetaInFirstUpdated).toEqual({ source: "lifecycle" });
        });

        test("when element is removed and re-appended, metadata is still available after reconnect", async () => {
          render(html`<metadata-test-object></metadata-test-object>`);
          const element = document.querySelector("metadata-test-object")! as MetadataTestObject;
          const parent = element.parentElement!;
          await element.updateComplete;

          expect(withKstMetadata<typeof objectMeta>(element).kstMetadata).toBe(objectMeta);

          element.remove();
          parent.appendChild(element);
          await element.updateComplete;

          expect(withKstMetadata<typeof objectMeta>(element).kstMetadata).toBe(objectMeta);
        });

        test("when element is moved to another parent, metadata is still available after disconnect and connect", async () => {
          render(html`
            <div id="container-a"><metadata-test-object></metadata-test-object></div>
            <div id="container-b"></div>
          `);
          const containerA = document.getElementById("container-a")!;
          const containerB = document.getElementById("container-b")!;
          const element = document.querySelector("metadata-test-object")! as MetadataTestObject;
          await element.updateComplete;

          expect(withKstMetadata<typeof objectMeta>(element).kstMetadata).toBe(objectMeta);

          containerB.appendChild(element);
          await element.updateComplete;

          expect(withKstMetadata<typeof objectMeta>(element).kstMetadata).toBe(objectMeta);
          expect(containerA.querySelector("metadata-test-object")).toBeNull();
          expect(containerB.querySelector("metadata-test-object")).toBe(element);
        });
      });

      describe("extending Component and KasstorElement with custom metadata", () => {
        test("base element that uses kstMetadata drives conditional render (alpha)", async () => {
          render(html`<extended-alpha></extended-alpha>`);
          const element = document.querySelector("extended-alpha")! as ExtendedAlphaElement;
          await element.updateComplete;

          const p = element.shadowRoot!.querySelector("p")!;
          expect(p.getAttribute("data-feature-id")).toBe("alpha");
          expect(p.textContent?.trim()).toBe("alpha");
          expect(withKstMetadata<typeof extendedAlphaMeta>(element).kstMetadata).toEqual(
            extendedAlphaMeta
          );
        });

        test("base element that uses kstMetadata drives conditional render (beta)", async () => {
          render(html`<extended-beta></extended-beta>`);
          const element = document.querySelector("extended-beta")! as ExtendedBetaElement;
          await element.updateComplete;

          const p = element.shadowRoot!.querySelector("p")!;
          expect(p.getAttribute("data-feature-id")).toBe("beta");
          expect(p.textContent?.trim()).toBe("beta");
          expect(withKstMetadata<typeof extendedBetaMeta>(element).kstMetadata).toEqual(
            extendedBetaMeta
          );
        });

        test("custom decorator that wraps Component still passes metadata (extended-gamma)", async () => {
          render(html`<extended-gamma></extended-gamma>`);
          const element = document.querySelector("extended-gamma")! as ExtendedGammaElement;
          await element.updateComplete;

          const p = element.shadowRoot!.querySelector("p")!;
          expect(p.getAttribute("data-feature-id")).toBe("beta");
          expect(p.textContent?.trim()).toBe("beta");
          expect(withKstMetadata<typeof extendedBetaMeta>(element).kstMetadata).toEqual(
            extendedBetaMeta
          );
        });

        test("multiple extended components each get their own metadata in render", async () => {
          render(html`
            <extended-alpha></extended-alpha>
            <extended-beta></extended-beta>
            <extended-gamma></extended-gamma>
          `);
          const alpha = document.querySelector("extended-alpha")! as ExtendedAlphaElement;
          const beta = document.querySelector("extended-beta")! as ExtendedBetaElement;
          const gamma = document.querySelector("extended-gamma")! as ExtendedGammaElement;
          await alpha.updateComplete;
          await beta.updateComplete;
          await gamma.updateComplete;

          expect(alpha.shadowRoot!.querySelector("p")!.textContent?.trim()).toBe("alpha");
          expect(beta.shadowRoot!.querySelector("p")!.textContent?.trim()).toBe("beta");
          expect(gamma.shadowRoot!.querySelector("p")!.textContent?.trim()).toBe("beta");
        });
      });
    });
  });
});
