// Mock library-summary.ts mirroring the format produced by @genexus/kasstor-build.
// This file is parsed via TS AST by KasstorSummarySource — keep it as a
// pure literal expression (no imports, no function calls).

export const librarySummary = [
  {
    access: "public",
    tagName: "kst-card",
    className: "KstCard",
    description: "A card component used in tests.",
    fullClassJSDoc: "",
    srcPath: "components/kst-card.lit.ts",
    developmentStatus: "stable",
    mode: "open",
    shadow: true,
    formAssociated: false,
    properties: [
      {
        name: "header",
        type: "string",
        attribute: "header",
        default: "",
        description: "Card header"
      },
      {
        name: "open",
        type: "boolean",
        attribute: "open",
        default: "false",
        reflect: true
      },
      {
        name: "internal",
        type: "string",
        attribute: false,
        default: ""
      }
    ],
    events: [
      {
        name: "kst-change",
        detailType: "number",
        bubbles: true,
        composed: true,
        description: "Fires on change."
      }
    ],
    methods: [
      {
        name: "focus",
        paramTypes: [],
        returnType: "void"
      }
    ],
    parts: [{ name: "wrapper" }],
    slots: [{ name: "" }, { name: "header" }],
    cssVariables: [{ name: "--kst-card-bg", default: "white" }]
  }
] as const;
