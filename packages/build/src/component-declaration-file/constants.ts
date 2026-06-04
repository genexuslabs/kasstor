export const COMPONENT_PROPERTIES_NAMESPACE_NAMES = {
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
 * Native DOM event names that the frameworks already expose through their own
 * `HTMLAttributes` typings (e.g. React's `onInput`, `onClick`).
 *
 * When a component emits an event whose name is in this set, we do NOT generate
 * a handler prop for React/StencilJS: their `HTMLAttributes` already provide a
 * correctly-typed (synthetic) handler, and generating our own would either be
 * redundant or clash in the type intersection. Only NON-native (custom) events
 * are generated, and they follow each framework's listener-name rule:
 *   - React  attaches `addEventListener(name.slice(2))` verbatim, so the prop
 *     is `on` + the verbatim event name (e.g. `onselectedItemsChange`).
 *   - StencilJS lowercases only the first character after `on`, so the prop is
 *     `on` + capitalized event name (e.g. `onSelectedItemsChange`).
 *   - SolidJS uses the namespaced `on:` directive (verbatim), so this set is
 *     not consulted for SolidJS (its `on:` handlers are always generated).
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
