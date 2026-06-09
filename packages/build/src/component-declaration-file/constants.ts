export const COMPONENT_PROPERTIES_NAMESPACE_NAMES = {
  react: "ComponentPropertiesReact",
  solidJs: "ComponentPropertiesSolidJS",
  jsx: "ComponentProperties",
  nothing: "ComponentProperties"
} as const;

/**
 * Names of the namespaces that hold the per-framework JSX prop types in each
 * auto-generated framework file.
 */
export const FRAMEWORK_JSX_NAMESPACE_NAMES = {
  react: "ReactJSX",
  solid: "SolidJsJSX",
  stencil: "StencilJSX"
} as const;

/**
 * Native DOM event names that StencilJS already exposes through its own
 * `JSXBase.HTMLAttributes` typings (e.g. `onInput`, `onClick`).
 *
 * When a component emits an event whose name is in this set, we do NOT generate
 * a handler prop for StencilJS: its `HTMLAttributes` already provides a
 * correctly-typed (synthetic) handler, and generating our own would either be
 * redundant or clash in the type intersection. Only NON-native (custom) events
 * are generated for StencilJS, following its listener-name rule (it lowercases
 * only the first character after `on`, so the prop is `on` + the capitalized
 * event name, e.g. `onSelectedItemsChange`).
 *
 * React does NOT consult this set: it generates EVERY event (native + custom),
 * mapping native events to React's own handler prop names so the component's
 * event type and JSDoc win over React's synthetic handler (see
 * `REACT_NATIVE_EVENT_HANDLERS`). SolidJS also generates every event (via its
 * namespaced `on:` directive), so it does not consult this set either.
 *
 * Source: the union of the keys of `GlobalEventHandlersEventMap` and
 * `ElementEventMap` from TypeScript's `lib.dom.d.ts` (the events any element
 * can dispatch and for which the frameworks expose handlers). Keep this in sync
 * with `lib.dom.d.ts` when bumping the TypeScript version.
 */
export const NATIVE_DOM_EVENTS: ReadonlySet<string> = new Set([
  // GlobalEventHandlersEventMap
  "abort",
  "animationcancel",
  "animationend",
  "animationiteration",
  "animationstart",
  "auxclick",
  "beforeinput",
  "beforetoggle",
  "blur",
  "cancel",
  "canplay",
  "canplaythrough",
  "change",
  "click",
  "close",
  "contextlost",
  "contextmenu",
  "contextrestored",
  "copy",
  "cuechange",
  "cut",
  "dblclick",
  "drag",
  "dragend",
  "dragenter",
  "dragleave",
  "dragover",
  "dragstart",
  "drop",
  "durationchange",
  "emptied",
  "ended",
  "error",
  "focus",
  "formdata",
  "gotpointercapture",
  "input",
  "invalid",
  "keydown",
  "keypress",
  "keyup",
  "load",
  "loadeddata",
  "loadedmetadata",
  "loadstart",
  "lostpointercapture",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "paste",
  "pause",
  "play",
  "playing",
  "pointercancel",
  "pointerdown",
  "pointerenter",
  "pointerleave",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "progress",
  "ratechange",
  "reset",
  "resize",
  "scroll",
  "scrollend",
  "securitypolicyviolation",
  "seeked",
  "seeking",
  "select",
  "selectionchange",
  "selectstart",
  "slotchange",
  "stalled",
  "submit",
  "suspend",
  "timeupdate",
  "toggle",
  "touchcancel",
  "touchend",
  "touchmove",
  "touchstart",
  "transitioncancel",
  "transitionend",
  "transitionrun",
  "transitionstart",
  "volumechange",
  "waiting",
  "webkitanimationend",
  "webkitanimationiteration",
  "webkitanimationstart",
  "webkittransitionend",
  "wheel",
  // ElementEventMap
  "fullscreenchange",
  "fullscreenerror"
]);

/**
 * Maps a native DOM event name to the prop name React exposes for it in its
 * JSX `DOMAttributes` (e.g. `input` -> `onInput`, `dblclick` -> `onDoubleClick`,
 * `mousedown` -> `onMouseDown`).
 *
 * React's handler prop names are NOT a simple `on` + capitalize of the event
 * name: they are camel-cased per word and some are renamed (`dblclick` becomes
 * `onDoubleClick`), so an explicit table is required. The values are taken
 * verbatim from `@types/react`'s `DOMAttributes` — keep them in sync when
 * bumping the React types.
 *
 * Used when generating React JSX types: for a native event a component
 * re-declares (often with its own `detail` type), React generation emits the
 * mapped prop (e.g. `onInput`) typed with the component's event interface and
 * omits React's synthetic handler from the intersection, so the component's
 * type and JSDoc win on hover.
 *
 * This is a SUBSET of {@link NATIVE_DOM_EVENTS}: a handful of native events do
 * not have a React handler (e.g. `animationcancel`, `selectionchange`,
 * `slotchange`, the `webkit*` aliases, `fullscreenchange`). Those are absent
 * here, so React generation falls back to the verbatim `on` + name rule (the
 * same rule used for custom events) and does not omit anything from the base
 * attributes.
 */
export const REACT_NATIVE_EVENT_HANDLERS: ReadonlyMap<string, string> = new Map([
  // GlobalEventHandlersEventMap (only the events React exposes a handler for)
  ["abort", "onAbort"],
  ["animationend", "onAnimationEnd"],
  ["animationiteration", "onAnimationIteration"],
  ["animationstart", "onAnimationStart"],
  ["auxclick", "onAuxClick"],
  ["beforeinput", "onBeforeInput"],
  ["beforetoggle", "onBeforeToggle"],
  ["blur", "onBlur"],
  ["cancel", "onCancel"],
  ["canplay", "onCanPlay"],
  ["canplaythrough", "onCanPlayThrough"],
  ["change", "onChange"],
  ["click", "onClick"],
  ["close", "onClose"],
  ["contextmenu", "onContextMenu"],
  ["copy", "onCopy"],
  ["cut", "onCut"],
  ["dblclick", "onDoubleClick"],
  ["drag", "onDrag"],
  ["dragend", "onDragEnd"],
  ["dragenter", "onDragEnter"],
  ["dragleave", "onDragLeave"],
  ["dragover", "onDragOver"],
  ["dragstart", "onDragStart"],
  ["drop", "onDrop"],
  ["durationchange", "onDurationChange"],
  ["emptied", "onEmptied"],
  ["ended", "onEnded"],
  ["error", "onError"],
  ["focus", "onFocus"],
  ["gotpointercapture", "onGotPointerCapture"],
  ["input", "onInput"],
  ["invalid", "onInvalid"],
  ["keydown", "onKeyDown"],
  ["keypress", "onKeyPress"],
  ["keyup", "onKeyUp"],
  ["load", "onLoad"],
  ["loadeddata", "onLoadedData"],
  ["loadedmetadata", "onLoadedMetadata"],
  ["loadstart", "onLoadStart"],
  ["lostpointercapture", "onLostPointerCapture"],
  ["mousedown", "onMouseDown"],
  ["mouseenter", "onMouseEnter"],
  ["mouseleave", "onMouseLeave"],
  ["mousemove", "onMouseMove"],
  ["mouseout", "onMouseOut"],
  ["mouseover", "onMouseOver"],
  ["mouseup", "onMouseUp"],
  ["paste", "onPaste"],
  ["pause", "onPause"],
  ["play", "onPlay"],
  ["playing", "onPlaying"],
  ["pointercancel", "onPointerCancel"],
  ["pointerdown", "onPointerDown"],
  ["pointerenter", "onPointerEnter"],
  ["pointerleave", "onPointerLeave"],
  ["pointermove", "onPointerMove"],
  ["pointerout", "onPointerOut"],
  ["pointerover", "onPointerOver"],
  ["pointerup", "onPointerUp"],
  ["progress", "onProgress"],
  ["ratechange", "onRateChange"],
  ["reset", "onReset"],
  ["resize", "onResize"],
  ["scroll", "onScroll"],
  ["scrollend", "onScrollEnd"],
  ["seeked", "onSeeked"],
  ["seeking", "onSeeking"],
  ["select", "onSelect"],
  ["stalled", "onStalled"],
  ["submit", "onSubmit"],
  ["suspend", "onSuspend"],
  ["timeupdate", "onTimeUpdate"],
  ["toggle", "onToggle"],
  ["touchcancel", "onTouchCancel"],
  ["touchend", "onTouchEnd"],
  ["touchmove", "onTouchMove"],
  ["touchstart", "onTouchStart"],
  ["transitioncancel", "onTransitionCancel"],
  ["transitionend", "onTransitionEnd"],
  ["transitionrun", "onTransitionRun"],
  ["transitionstart", "onTransitionStart"],
  ["volumechange", "onVolumeChange"],
  ["waiting", "onWaiting"],
  ["wheel", "onWheel"]
]);
