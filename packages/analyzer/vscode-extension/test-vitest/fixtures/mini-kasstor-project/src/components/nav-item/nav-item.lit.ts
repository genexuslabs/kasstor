// Mirrors chameleon's auto-generated pattern: a class extending the
// shared base, plus a `declare global` block whose `HTMLElementTagNameMap`
// entry points at an *interface* extending the class — the same shape
// `kasstor-build` emits and the shape that exposed the empty-overwrite
// bug we now have a regression test for.
class KstNavItem {
  caption?: string;
  level: number = 0;
}

declare global {
  // prettier-ignore
  interface HTMLKstNavItemElement extends KstNavItem {}
  interface HTMLElementTagNameMap {
    "kst-nav-item": HTMLKstNavItemElement;
  }
}
