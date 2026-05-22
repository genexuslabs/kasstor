# `kst-theme`

<p>The <code>kst-theme</code> component loads and manages named stylesheets that can be
shared and reused across the Document or any Shadow Root via the
<code>adoptedStyleSheets</code> API.</p>

<details open>
  <summary>
  
  ## Properties
  </summary>
  
### `attachStyleSheetsDisabled:  boolean`

<p>Indicates whether the theme should be attached to the Document or the
ShadowRoot after loading.</p>
<p>The value can be overridden by the <code>attachStyleSheet</code> property of each
individual item in the model. When toggled at runtime, already-loaded
themes are attached or detached accordingly without re-fetching.</p>

**Attribute**: <code>attach-style-sheets-disabled</code>

**Default**: <code>false</code>

---

### `avoidFlashOfUnstyledContentDisabled:  boolean`

<p><code>true</code> to disable hiding the contents of the root node while the
stylesheets are being loaded. When disabled (default), a <code>&lt;style&gt;</code>
element with <code>visibility: hidden !important</code> is rendered into the host
until all themes resolve. Set to <code>true</code> if the initial unstyled flash is
acceptable or if the themes are expected to be cached.</p>

**Attribute**: <code>avoid-flash-of-unstyled-content-disabled</code>

**Default**: <code>false</code>

---

### `model:  ThemeModel | undefined | null`

<p>Specifies the themes to load. Accepts a single theme name (string), an
array of theme names, a single <code>ThemeItemModel</code> object, or an array of
<code>ThemeItemModel</code> objects. Each item may specify a <code>name</code> and an optional
<code>attachStyleSheet</code> override.</p>
<p>Theme names are resolved against the global registry created with
<code>registerDesignSystem</code>; an unknown name will eventually time out.</p>
<p>When set to <code>undefined</code> or <code>null</code>, no themes are loaded.</p>
<p><strong>Note:</strong> The model is only processed on the first non-null assignment.
Subsequent changes to an already-loaded model are currently not reactive.</p>

**Attribute**: <code>model</code>

**Default**: <code>undefined</code>
</details>

<details open>
  <summary>
  
  ## Events
  </summary>
  
### `themeLoaded: { success: string[]; failed: string[] }`

<p>Emitted after all theme loading promises have completed. The event payload
contains a <code>success</code> array with the names of the themes that loaded
successfully and a <code>failed</code> array with the names of the themes that
failed (timed out or registry miss).</p>
<p>Bubbles: <code>true</code>. Composed: <code>false</code> — the event does not cross shadow DOM
boundaries.</p>
</details>
