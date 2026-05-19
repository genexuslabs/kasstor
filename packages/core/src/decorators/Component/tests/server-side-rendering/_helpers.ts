// Shared utilities for SSR-related e2e tests.
//
// SSR cannot run in a chromium e2e (the test environment is a real browser),
// so we simulate the SSR outcome the way Astro's SSR polyfill produces it:
// the host element exists in the DOM and has a populated shadow root before
// the custom element is upgraded. Kasstor detects that via
// `componentWasServerSideRendered` (it checks `shadowRoot.children.length`
// in the constructor) and flips `wasServerSideRendered` to `true`.
//
// Lit's own hydration tests use the same general pattern (hand-crafted SSR
// HTML in a real browser) — they just use `setHTMLUnsafe` + DSD + the
// `defer-hydration` attribute. Kasstor doesn't have `defer-hydration`, so we
// must guarantee the shadow root is attached BEFORE custom-element upgrade.
// That's why each test does `createElement` → `attachShadow` → register, in
// that order.

import type { PropertyValues } from "lit";
import { html } from "lit/html.js";
import { vi } from "vitest";
import { renderByPlatform } from "../../../../directives/render-by-platform/index.js";
import { Component, KasstorElement } from "../../index.js";

/**
 * Constructor type that any KasstorElement subclass (anonymous factories
 * included) is assignable to. `KasstorElementClass` cannot be used directly
 * because it's generic in `Metadata` and concrete subclasses are not — TS
 * rejects the assignment with TS2419 / TS2345.
 */
export type KasstorElementClass = abstract new () => KasstorElement;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

/**
 * Hosts created by `setupServerRenderedHost` are tracked here so each test
 * file can remove them in its own `afterEach`.
 */
export const ssrCreatedHosts: HTMLElement[] = [];

/** Removes every host registered through `setupServerRenderedHost`. */
export function cleanupSsrHosts(): void {
  for (const host of ssrCreatedHosts) {
    host.remove();
  }
  ssrCreatedHosts.length = 0;
}

/**
 * Builds a host with a pre-populated shadow root and then registers the
 * custom element class — mirroring the order an SSR'd page hits the
 * browser. The constructor sees a shadow root with children, so
 * `componentWasServerSideRendered` returns `true`.
 */
export function setupServerRenderedHost(
  tag: string,
  ctor: KasstorElementClass,
  shadowInnerHtml: string,
  options?: { lightDomHtml?: string }
): HTMLElement {
  if (customElements.get(tag)) {
    throw new Error(`Tag "${tag}" is already defined — pick a unique one per test.`);
  }

  // 1) Element exists in the document while still being an "unknown element".
  const host = document.createElement(tag);
  if (options?.lightDomHtml) {
    host.innerHTML = options.lightDomHtml;
  }
  document.body.appendChild(host);
  ssrCreatedHosts.push(host);

  // 2) Pre-attach a shadow root and populate it — this is what Astro / DSD
  //    produce before the element is upgraded.
  host.attachShadow({ mode: "open" }).innerHTML = shadowInnerHtml;

  // 3) Register the class. customElements upgrades the pending instance
  //    synchronously, which runs the KasstorElement constructor with the
  //    populated shadow root already in place.
  Component({ tag: tag as `${string}-${string}` })(
    ctor as Parameters<ReturnType<typeof Component>>[0]
  );

  return host;
}

/** Casts the element to expose its `protected` `wasServerSideRendered` getter. */
export function readSsrFlag(element: HTMLElement): boolean {
  return (element as unknown as { wasServerSideRendered: boolean }).wasServerSideRendered;
}

// ---------------------------------------------------------------------------
// Component class factories
//
// `customElements.define` rejects registering the same constructor twice, so
// every test that calls it needs a FRESH subclass. Factories below build a
// new anonymous KasstorElement subclass on demand.
// ---------------------------------------------------------------------------

export function makeSsrSimpleClass(): KasstorElementClass {
  return class extends KasstorElement {
    override render() {
      return html`<p data-source="client">client-rendered</p>`;
    }
  };
}

export function makeSsrPlainClass(): KasstorElementClass {
  return class extends KasstorElement {
    override render() {
      return html`<p>plain</p>`;
    }
  };
}

export interface SsrLifecycleInstance extends KasstorElement {
  firstWillUpdateMock: ReturnType<typeof vi.fn>;
  willUpdateMock: ReturnType<typeof vi.fn>;
  firstUpdatedMock: ReturnType<typeof vi.fn>;
  ssrFlagAtConstructor: boolean;
}

export function makeSsrLifecycleClass(): KasstorElementClass {
  return class extends KasstorElement implements SsrLifecycleInstance {
    firstWillUpdateMock = vi.fn();
    willUpdateMock = vi.fn();
    firstUpdatedMock = vi.fn();
    // Captured right after super() runs, which is where KasstorElement sets
    // `#serverSideRendered`. Proves the flag is already populated by the
    // time user code in the constructor can read it.
    ssrFlagAtConstructor = (this as unknown as { wasServerSideRendered: boolean })
      .wasServerSideRendered;

    protected override firstWillUpdate(_changed: PropertyValues): void {
      this.firstWillUpdateMock();
    }
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed);
      this.willUpdateMock();
    }
    override firstUpdated(_changed: PropertyValues): void {
      this.firstUpdatedMock();
    }
    override render() {
      return html`<span>after-hydration</span>`;
    }
  };
}

/**
 * Component that reads a `@property` (bound to an attribute) during
 * `firstWillUpdate`. This is the documented SSR use case for the hook: in SSR
 * mode Lit does NOT initialize properties from attributes in `connectedCallback`,
 * but it DOES initialize them just before the first `willUpdate` — so the prop
 * value should be visible inside `firstWillUpdate`.
 */
export interface SsrAttributeAwareInstance extends KasstorElement {
  message: string;
  capturedInFirstWillUpdate: string | undefined;
}
export function makeSsrAttributeAwareClass(): KasstorElementClass {
  return class extends KasstorElement implements SsrAttributeAwareInstance {
    static override properties = {
      message: { type: String }
    };
    message: string = "<default>";
    capturedInFirstWillUpdate: string | undefined = undefined;

    protected override firstWillUpdate(_changed: PropertyValues): void {
      this.capturedInFirstWillUpdate = this.message;
    }
    override render() {
      return html`<p>${this.message}</p>`;
    }
  };
}

/**
 * Component that mutates a property inside `firstWillUpdate`. Per the JSDoc:
 * "Setting properties inside this method will not trigger another update."
 */
export interface SsrFirstWillUpdateSetterInstance extends KasstorElement {
  counter: number;
  willUpdateCount: number;
}
export function makeSsrFirstWillUpdateSetterClass(): KasstorElementClass {
  return class extends KasstorElement implements SsrFirstWillUpdateSetterInstance {
    static override properties = {
      counter: { type: Number }
    };
    counter: number = 0;
    willUpdateCount: number = 0;

    protected override firstWillUpdate(_changed: PropertyValues): void {
      // Mutating a reactive property here should NOT enqueue another update —
      // changes made in this hook are folded into the first cycle.
      this.counter = 42;
    }
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed);
      this.willUpdateCount++;
    }
    override render() {
      return html`<p data-counter="${this.counter}">${this.counter}</p>`;
    }
  };
}

/**
 * Component that records the order in which its lifecycle hooks run during
 * the first update cycle. Used to verify the canonical sequence:
 * `firstWillUpdate` → `willUpdate` → `render` → `firstUpdated` → `updated`.
 */
export interface SsrHookOrderInstance extends KasstorElement {
  hookOrder: string[];
}
export function makeSsrHookOrderClass(): KasstorElementClass {
  return class extends KasstorElement implements SsrHookOrderInstance {
    hookOrder: string[] = [];

    protected override firstWillUpdate(_changed: PropertyValues): void {
      this.hookOrder.push("firstWillUpdate");
    }
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed);
      this.hookOrder.push("willUpdate");
    }
    override firstUpdated(_changed: PropertyValues): void {
      this.hookOrder.push("firstUpdated");
    }
    override updated(changed: PropertyValues): void {
      super.updated(changed);
      this.hookOrder.push("updated");
    }
    override render() {
      this.hookOrder.push("render");
      return html`<span>order</span>`;
    }
  };
}

export function makeSsrRenderByPlatformClass(): KasstorElementClass {
  return class extends KasstorElement {
    override render() {
      return html`<span data-host="rbp"
        >${renderByPlatform("browser-value", "server-value")}</span
      >`;
    }
  };
}

export function makeSsrRenderByPlatformBrowserOnlyClass(): KasstorElementClass {
  return class extends KasstorElement {
    override render() {
      return html`<span data-host="rbp-bo">${renderByPlatform("browser-only-content")}</span>`;
    }
  };
}
