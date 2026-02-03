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
 * A Lit directive that conditionally renders content based on the current platform (browser or server).
 *
 * During server-side rendering (SSR), it renders the server value. On the browser, it renders the browser value.
 *
 * When hydrating a server-rendered component, it waits for the hydration process to complete before switching
 * to the browser value to prevent hydration mismatch errors.
 *
 * @example
 * ```ts
 * html`
 *   <h1>${renderByPlatform("Browser only", "Server only")}</h1>
 *   <p>${renderByPlatform("Browser only description")}</p>
 * `
 * ```
 *
 * @param browserValue - The value to render in the browser environment
 * @param serverValue - The value to render in the server environment. If not provided, uses browserValue
 *
 * @returns The appropriate value based on the current platform and hydration state.
 *
 * @remarks
 * - During client-side hydration, returns the server value initially and switches to the browser value after hydration completes
 * - Requires the directive to be used with a {@link KasstorElement} component
 */
export const renderByPlatform = directive(RenderByPlatformDirective);

export type { RenderByPlatformDirective };

