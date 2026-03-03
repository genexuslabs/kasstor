# Testing

This page covers migrating from StencilJS testing (Jest + Puppeteer) to Kasstor's recommended stack: Vitest + Playwright.

## Dependencies

### Remove

```bash
npm uninstall @types/jest @types/puppeteer jest jest-cli puppeteer
```

Remove all Jest and Puppeteer configuration files (`jest.config.*`, etc.) and any Jest configuration in `package.json`.

### Install

```bash
npm i -D vitest @vitest/browser @vitest/browser-playwright playwright vitest-browser-lit
```

Optional extras:

```bash
npm i -D @vitest/coverage-v8     # Code coverage
npm i -D @vitest/ui              # Interactive test UI
npm i -D vite-plugin-static-copy # Copy static assets to the test server
```

## Vitest Configuration

Create `vitest.config.ts` at the project root:

```ts
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    projects: [
      // Unit tests (Node environment)
      {
        extends: true,
        test: {
          include: ["src/tests/**/*.{test,spec}.ts"],
          name: "unit",
          environment: "node"
        }
      },
      // E2E / browser tests
      {
        extends: true,
        test: {
          exclude: ["node_modules", "dist"],
          include: ["**/*.e2e.ts"],
          name: "browser",
          maxWorkers: 16,
          browser: {
            provider: playwright(),
            screenshotFailures: false,
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }]
          }
        }
      }
    ]
  }
});
```

If you need to copy static assets to the test server (fonts, images, etc.), install `vite-plugin-static-copy` and add it to the browser project's `plugins`:

```ts
import { playwright } from "@vitest/browser-playwright";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    projects: [
      // Unit tests (Node environment)
      {
        extends: true,
        test: {
          include: ["src/tests/**/*.{test,spec}.ts"],
          name: "unit",
          environment: "node"
        }
      },
      // E2E / browser tests
      {
        extends: true,
        plugins: [
          viteStaticCopy({
            targets: [{ src: "src/assets/fonts", dest: "fonts" }]
          })
        ],
        test: {
          exclude: ["node_modules", "dist"],
          include: ["**/*.e2e.ts"],
          name: "browser",
          maxWorkers: 16,
          browser: {
            provider: playwright(),
            screenshotFailures: false,
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }]
          }
        }
      }
    ]
  }
});
```

## Key API Changes

| StencilJS (Jest + Puppeteer)                         | Kasstor (Vitest + Playwright)                          |
| ---------------------------------------------------- | ------------------------------------------------------ |
| `import { newE2EPage } from "@stencil/core/testing"` | `import { render, cleanup } from "vitest-browser-lit"` |
| `const page = await newE2EPage({ html: '...' })`     | `render(html\`...\`)`                                  |
| `const el = await page.find("my-el")`                | `document.querySelector("my-el")!`                     |
| `await page.waitForChanges()`                        | `await el.updateComplete`                              |
| `el.setProperty("prop", value)`                      | `el.prop = value` (direct assignment)                  |
| `await el.callMethod("methodName", ...args)`         | `el.methodName(...args)` (direct call)                 |
| `const spy = await el.spyOnEvent("eventName")`       | Standard Vitest spies / `addEventListener`             |
| `expect(spy).toHaveReceivedEventDetail(val)`         | Check `event.detail` directly                          |
| `await page.find("my-el >>> .inner")`                | `el.shadowRoot!.querySelector(".inner")`               |
| `afterEach(() => {})`                                | `afterEach(cleanup)`                                   |

## Migration Examples

### StencilJS Test

```ts
import { E2EElement, E2EPage, newE2EPage } from "@stencil/core/testing";

describe("my-checkbox", () => {
  let page: E2EPage;
  let el: E2EElement;

  beforeEach(async () => {
    page = await newE2EPage({
      html: `<my-checkbox checked></my-checkbox>`
    });
    el = await page.find("my-checkbox");
  });

  it("should reflect the disabled attribute", async () => {
    el.setProperty("disabled", true);
    await page.waitForChanges();

    const attr = await el.getAttribute("disabled");
    expect(attr).toBe("");
  });

  it("should emit input event on click", async () => {
    const spy = await el.spyOnEvent("input");

    // Click inside shadow DOM
    const inner = await page.find("my-checkbox >>> input");
    await inner.click();
    await page.waitForChanges();

    expect(spy).toHaveReceivedEventTimes(1);
    expect(spy).toHaveReceivedEventDetail(false);
  });

  it("should call a public method", async () => {
    await el.callMethod("reset");
    await page.waitForChanges();

    const checked = await el.getProperty("checked");
    expect(checked).toBe(false);
  });
});
```

### Kasstor Test

```ts
import { html } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-lit";

// Import the component so it registers
import "../my-checkbox.lit.js";
import type { MyCheckbox } from "../my-checkbox.lit.js";

describe("my-checkbox", () => {
  afterEach(cleanup);

  it("should reflect the disabled attribute", async () => {
    render(html`<my-checkbox checked></my-checkbox>`);
    const el = document.querySelector("my-checkbox")! as MyCheckbox;
    await el.updateComplete;

    el.disabled = true;
    await el.updateComplete;

    expect(el.getAttribute("disabled")).toBe("");
    expect(el.disabled).toBe(true);
  });

  it("should emit input event on click", async () => {
    render(html`<my-checkbox checked></my-checkbox>`);
    const el = document.querySelector("my-checkbox")! as MyCheckbox;
    await el.updateComplete;

    // Listen for the event
    const handler = vi.fn();
    el.addEventListener("input", handler);

    // Click inside shadow DOM — direct DOM access
    const inner = el.shadowRoot!.querySelector("input")!;
    inner.click();
    await el.updateComplete;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toBe(false);
  });

  it("should call a public method", async () => {
    render(html`<my-checkbox checked></my-checkbox>`);
    const el = document.querySelector("my-checkbox")! as MyCheckbox;
    await el.updateComplete;

    el.reset();
    await el.updateComplete;

    expect(el.checked).toBe(false);
  });
});
```

## Key Advantages of the New Testing Approach

1. **Direct DOM access:** You operate on the actual page, not a serialized representation. Element references stay alive — no need to re-query after every change.

2. **No serialization overhead:** In Puppeteer, property values were serialized between Node and the browser. In Vitest browser mode, everything runs in the same context.

3. **Standard APIs:** Use `document.querySelector`, `element.shadowRoot`, `addEventListener`, etc. — no Stencil-specific APIs to learn.

4. **Better TypeScript support:** Cast elements to their component type and get full type safety for properties and methods.

5. **Familiar Vitest API:** `describe`, `it`, `expect`, `vi.fn()`, `vi.spyOn()`, `beforeEach`, `afterEach` — if you know Jest, you already know Vitest.

---

**Next:** [Full Example](./08-full-example.md)

