import { AsyncDirective, directive } from "lit/async-directive.js";
import { nothing, type Part } from "lit/html.js";
import type { KasstorElement } from "../../decorators/Component/index.js";
import { IS_SERVER } from "../../development-flags.js";

class RenderByPlatformDirective extends AsyncDirective {
  #host: KasstorElement | undefined;

  override update(part: Part, [browserValue, serverValue]: [unknown, unknown]) {
    this.#host = part.options?.host as KasstorElement | undefined;

    // If it was rendered on the server and it has not hydrated yet, wait for
    // the hydration process to be completed. Otherwise, a hydration mismatch
    // error will be thrown
    if (
      this.#host &&
      !this.#host.hasUpdated &&
      // @ts-expect-error TODO: wasServerSideRendered is a protected property,
      // we should find a better way to check this
      this.#host.wasServerSideRendered
    ) {
      // Wait for the component to finish its first update
      queueMicrotask(() => {
        // TODO: We have to clean up the part for some reason before setting
        // the browser's value. This seems like a bug of Lit
        this.setValue(nothing);

        this.setValue(browserValue);
      });

      // Return the server value in the hydration process to avoid mismatches
      return serverValue;
    }

    return browserValue;
  }

  // Only for SSR or imperative calls
  override render(browserValue: unknown, serverValue?: unknown) {
    return IS_SERVER ? serverValue : browserValue;
  }
}

/**
 * Renders different content on the server vs. the browser and avoids hydration mismatch.
 *
 * @param browserValue - Value to render in the browser.
 * @param serverValue - Value to render on the server. If omitted, the server renders nothing for this expression (useful for browser-only content).
 *
 * Behavior:
 * - Server: renders `serverValue`; client: renders `browserValue`.
 * - When `serverValue` is omitted, the server renders nothing there; only the browser shows `browserValue` after hydration. Use this for client-only UI or content that depends on `window` or other browser APIs.
 * - During hydration, keeps the server value until first update, then switches to `browserValue`.
 * - Must be used in a template rendered by a {@link KasstorElement} (host needed for hydration).
 *
 * Restrictions:
 * - For identical content in both environments, don't use this directive; render the value directly.
 * - Using in a standalone template (no KasstorElement host) can break hydration.
 *
 * @example
 * ```ts
 * // Different content per environment
 * html`<h1>${renderByPlatform("Browser only", "Server only")}</h1>`
 * // Browser-only content (server renders nothing here)
 * html`<p>${renderByPlatform("Client-only text")}</p>`
 * ```
 */
export const renderByPlatform = directive(RenderByPlatformDirective);

export type { RenderByPlatformDirective };

