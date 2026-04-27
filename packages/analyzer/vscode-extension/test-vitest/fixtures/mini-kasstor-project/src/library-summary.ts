// Minimal library-summary fixture used by the bundled-plugin tests. Mirrors
// the shape `@genexus/kasstor-build` emits for the chameleon project so we
// exercise the full kasstor-summary → CEM → htmlStore ingestion path that
// the IDE plugin runs on every cold start.
export const librarySummary = [
  {
    access: "public",
    tagName: "kst-button",
    className: "KstButton",
    description: "A test button component used by the IDE plugin tests.",
    srcPath: "./components/button/button.lit.ts",
    developmentStatus: "stable",
    mode: "open",
    shadow: true,
    properties: [
      {
        name: "disabled",
        attribute: "disabled",
        type: " boolean",
        default: "false",
        description: "Whether the button is disabled."
      },
      {
        name: "label",
        attribute: "label",
        type: " string",
        default: '""',
        description: "The text rendered inside the button."
      }
    ],
    methods: [],
    events: [
      {
        name: "buttonClick",
        bubbles: true,
        cancelable: false,
        composed: true,
        detailType: "MouseEvent",
        description: "Fired when the button is activated."
      }
    ],
    parts: [{ name: "trigger", description: "The underlying `<button>` element." }],
    slots: [{ name: "", description: "Default slot for button content." }],
    cssVariables: []
  },
  {
    // Second fixture component used by the regression test for the empty-
    // overwrite bug. The shape mirrors chameleon's `ch-navigation-list-item`
    // — its `.lit.ts` contains an auto-generated
    // `interface HTMLKstNavItemElement extends KstNavItem` plus an
    // `interface HTMLElementTagNameMap { "kst-nav-item": HTMLKstNavItemElement }`
    // block. With the source-file scanner running over that file, the empty
    // tag entry it produced used to clobber the rich data the
    // library-summary absorbed into the same DECLARED htmlStore bucket.
    access: "public",
    tagName: "kst-nav-item",
    className: "KstNavItem",
    description: "A navigation list item used by the regression suite.",
    srcPath: "./components/nav-item/nav-item.lit.ts",
    developmentStatus: "stable",
    mode: "open",
    shadow: true,
    properties: [
      {
        name: "caption",
        attribute: "caption",
        type: " string | undefined",
        default: "undefined",
        description: "The caption rendered inside the item."
      },
      {
        name: "level",
        attribute: "level",
        type: " number",
        default: "0",
        description: "Nesting level of the item."
      }
    ],
    methods: [],
    events: [],
    parts: [],
    slots: [],
    cssVariables: []
  }
] as const;
