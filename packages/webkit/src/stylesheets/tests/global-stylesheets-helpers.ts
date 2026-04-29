// ---------------------------------------------------------------------------
// Shared helpers for global-stylesheets e2e tests
// ---------------------------------------------------------------------------

const testElements: HTMLElement[] = [];
const originalDocumentSheets = [...document.adoptedStyleSheets];

export function createSheet(rule?: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  if (rule) {
    sheet.replaceSync(rule);
  }
  return sheet;
}

export function createElement(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  testElements.push(el);
  return el;
}

export function createShadowHost(): {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
} {
  const host = document.createElement("div");
  const shadowRoot = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);
  testElements.push(host);
  return { host, shadowRoot };
}

export function createElementInShadow(shadowRoot: ShadowRoot): HTMLDivElement {
  const el = document.createElement("div");
  shadowRoot.appendChild(el);
  // Track the host for cleanup (element inside shadow is removed when host is)
  return el;
}

export function countOccurrences(
  sheets: CSSStyleSheet[],
  target: CSSStyleSheet
): number {
  return sheets.filter(s => s === target).length;
}

/**
 * Removes all test elements from the DOM and restores
 * document.adoptedStyleSheets to its original state.
 * Each test file should call `afterEach(cleanup)`.
 */
export function cleanup(): void {
  for (const el of testElements) {
    el.remove();
  }
  testElements.length = 0;

  document.adoptedStyleSheets = [...originalDocumentSheets];
}
