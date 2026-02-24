# Best Practices — @genexus/kasstor-core

## Property Configuration

Use typed properties with explicit configuration for better type safety:

```ts
@property() title: string = '';

@property({ type: Number }) count: number = 0;

@property({ type: Boolean, reflect: true }) disabled: boolean = false;
```

## Do's and Don'ts

**Do**

- Extend `KasstorElement` (not `LitElement`) when using `@Component`; use a unique `tag` per component.

- Use `@Event()` on a property typed as `EventEmitter<Detail>`; call `this.myEvent.emit(detail)` and check `defaultPrevented` when the event is cancelable.

- Use `@Observe` on a method; pass only names of existing `@property` or `@state` fields. Prefer one responsibility per callback.

- Use `lazyLoad()` only on the element tag (e.g. `<my-panel ${lazyLoad()}></my-panel>`). Ensure the component is registered in a Kasstor library.

- Use `renderByPlatform(browserValue, serverValue)` when content must differ by environment (or when you want browser-only content; see Pro tip below).

**Don't**

- Apply `@Event()` to a method or `@Observe` to a non-method.

- Use `shadow: false` unless you have a strong reason (you lose slots and style encapsulation).

- Use `lazyLoad()` in attribute or child positions; it only works on the element tag.

## Pro tip: browser-only content with renderByPlatform

If you want to render something **only in the browser** (e.g. client-only UI, feature that depends on `window`), call `renderByPlatform(browserValue)` with a single argument. The server will render nothing for that expression, and after hydration the browser will show `browserValue`. If you want the **same** content on server and client, don't use the directive—render the value directly.
