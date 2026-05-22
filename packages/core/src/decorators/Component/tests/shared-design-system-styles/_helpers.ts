// Shared test helpers for the `sharedDesignSystemStyles` e2e suite.
//
// The suite is split into multiple files under this folder, each focused on
// a single behavioural concern (cache hits, async download, shadow lifecycle,
// light DOM, ordering, SSR, etc.). All files share these helpers so the test
// surface stays small and consistent.
//
// State that lives here:
//   - `tagCounter`: monotonically incrementing counter that produces a unique
//     custom-element tag per call. Shared across files so concurrently-run
//     tests never collide on the global `customElements` registry.
//   - `createdHosts`: every host returned by `setupHost` / created via
//     `trackHost` is registered here, so each test file's own `afterEach`
//     can call `cleanupHosts()` and tear down anything attached during the
//     test.

import { html } from "lit/html.js";
import { Component, KasstorElement } from "../../index.js";

export type KasstorElementClass = abstract new () => KasstorElement;

export const PROMISE_SLOT_DESCRIPTION = "kasstor-shared-design-system-stylesheet-promises";
export const STYLESHEETS_SLOT_DESCRIPTION = "kasstor-shared-design-system-stylesheets";
export const NAMES_SLOT_DESCRIPTION = "kasstor-shared-design-system-stylesheet-names";

function findSymbol(target: object, description: string): symbol | undefined {
  return Object.getOwnPropertySymbols(target).find(s => s.description === description);
}

/**
 * Reads a private prototype slot installed by the `@Component` decorator. The
 * decorator stores per-class state on symbols whose `description` is the only
 * stable handle — there is no public API.
 */
export function readPrototypeSlot<T>(
  ctor: CustomElementConstructor | KasstorElementClass,
  description: string
): T | undefined {
  const proto = (ctor as unknown as { prototype: object }).prototype;
  const symbol = findSymbol(proto, description);
  if (symbol === undefined) {
    return undefined;
  }
  return (proto as Record<symbol, T>)[symbol];
}

/** Default subclass used by `setupHost` when no `classFactory` is provided. */
export function makePlainClass(): KasstorElementClass {
  return class extends KasstorElement {
    override render() {
      return html`<p data-original>client</p>`;
    }
  };
}

export interface SetupOptions {
  /** Shared design-system bundle names to declare on the component. */
  sharedDesignSystemStyles?: string[];
  /** When set, pre-attach a shadow root with this innerHTML BEFORE
   *  registering the class — turns the host into an "SSR'd" instance. */
  ssrShadowHtml?: string;
  /** Forwarded to the `Component` decorator's `shadow` option. Pass `false`
   *  to register a light-DOM component (default is shadow open). */
  shadow?: false;
  /** Forwarded to the `Component` decorator's `styles` option. */
  styles?: string;
  /** Optional class factory — defaults to {@link makePlainClass}. */
  classFactory?: () => KasstorElementClass;
}

const createdHosts: HTMLElement[] = [];

/** Registers an HTMLElement for automatic cleanup at the end of the test. */
export function trackHost(host: HTMLElement): void {
  createdHosts.push(host);
}

/** Builds a host + registers a fresh `KasstorElement` subclass with the given options. */
export function setupHost(tag: string, options: SetupOptions = {}): KasstorElement {
  if (customElements.get(tag)) {
    throw new Error(`Tag "${tag}" is already defined — pick a unique one per test.`);
  }

  const host = document.createElement(tag);
  document.body.appendChild(host);
  createdHosts.push(host);

  if (options.ssrShadowHtml !== undefined) {
    host.attachShadow({ mode: "open" }).innerHTML = options.ssrShadowHtml;
  }

  Component({
    tag: tag as `${string}-${string}`,
    sharedDesignSystemStyles: options.sharedDesignSystemStyles,
    shadow: options.shadow,
    styles: options.styles
  })((options.classFactory ?? makePlainClass)() as never);

  return host as KasstorElement;
}

/**
 * Registers a fresh `KasstorElement` subclass without creating an instance, and
 * returns the constructor so the test can spawn multiple instances later.
 */
export function registerClass(tag: string, options: SetupOptions = {}): CustomElementConstructor {
  if (customElements.get(tag)) {
    throw new Error(`Tag "${tag}" is already defined — pick a unique one per test.`);
  }

  Component({
    tag: tag as `${string}-${string}`,
    sharedDesignSystemStyles: options.sharedDesignSystemStyles,
    shadow: options.shadow,
    styles: options.styles
  })((options.classFactory ?? makePlainClass)() as never);

  return customElements.get(tag)!;
}

/** Returns the actual `ShadowRoot` adoption target for a shadow component. */
export function shadowAdoptedSheets(host: KasstorElement): readonly CSSStyleSheet[] {
  return host.shadowRoot!.adoptedStyleSheets;
}

/** Clears every cache the `@genexus/kasstor-design-system` package owns. */
export function clearDesignSystemState(): void {
  globalThis.geneXusDesignSystemsRegistry?.clear();
  globalThis.geneXusDesignSystemsLoaders?.clear();
  globalThis.geneXusDesignSystemsStyleSheets?.clear();
  globalThis.geneXusDesignSystemsStyleSheetPromises?.clear();
}

/** Returns a fresh `CSSStyleSheet` with a marker rule for identity / computed-style checks. */
export function makeStyleSheet(rule: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(rule);
  return sheet;
}

let tagCounter = 0;
/** Monotonically increasing unique tag — safe across all files in the suite. */
export const uniqueTag = (): `kst-shared-ds-${number}` => `kst-shared-ds-${++tagCounter}` as const;

/** Yields long enough that any pending microtasks AND a macrotask have run. */
export function flushMicroAndMacroTasks(): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, 0));
}

/**
 * Runs `fn` while listening for a global `error` event, returning the captured
 * `Error` if one fires (or `undefined` if no error was reported).
 *
 * Browsers swallow constructor exceptions during a synchronous custom-element
 * upgrade (the spec mandates that `customElements.define` reports the error
 * to the page via `window.onerror` instead of re-throwing). This helper lets
 * the SSR fail-fast tests observe that the constructor did throw without
 * relying on `expect.toThrow`, which only sees thrown values that propagate
 * up the JS call stack.
 *
 * The default-action of the error event is suppressed so the test reporter
 * does not also flag it as an unhandled error.
 */
export async function captureUpgradeError(fn: () => void): Promise<Error | undefined> {
  let captured: Error | undefined;
  const handler = (event: ErrorEvent) => {
    captured = event.error instanceof Error ? event.error : new Error(event.message);
    event.preventDefault();
  };
  window.addEventListener("error", handler);
  try {
    fn();
    // The error event is dispatched synchronously during the upgrade in
    // current Chromium/WebKit/Gecko, but flush a microtask + macrotask just
    // in case some future browser defers it.
    await flushMicroAndMacroTasks();
  } finally {
    window.removeEventListener("error", handler);
  }
  return captured;
}

/** Removes every host tracked by `trackHost` / `setupHost` during the test. */
export function cleanupHosts(): void {
  for (const host of createdHosts) {
    host.remove();
  }
  createdHosts.length = 0;
}
