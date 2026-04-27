export type LitHtmlAttributeModifier = "." | "?" | "@";

export const LIT_HTML_PROP_ATTRIBUTE_MODIFIER = ".";

export const LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER = "?";

export const LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER = "@";

export const LIT_HTML_ATTRIBUTE_MODIFIERS: LitHtmlAttributeModifier[] = [
	LIT_HTML_PROP_ATTRIBUTE_MODIFIER,
	LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER,
	LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER
];

export const DIAGNOSTIC_SOURCE = "kasstor-lit-analyzer";

export const TS_IGNORE_FLAG = "@ts-ignore";

export const VERSION = "0.1.0";

// Default timeout for an analyzer operation. Held generous because the
// first call after a cold IDE start has to walk the program once to
// register components from external sources (CEM ingest, kasstor summary)
// and the per-file scanner. The previous 150 ms ceiling was set when the
// analyzer only covered <100-file projects; in a real monorepo it tripped
// on every keystroke before the externals had been loaded. 3 s leaves
// plenty of headroom; the pre-warmed steady-state lookup is sub-ms.
export const MAX_RUNNING_TIME_PER_OPERATION = 3000;

/**
 * Cap on how many times the analyzer retries the external-manifest load
 * when the previous attempt produced zero manifests. Used by
 * `default-lit-analyzer-context.ensureExternalsLoaded` so cold-start
 * cases (IDE plugin pinging the analyzer before the workspace disk view
 * is ready) get another chance, while a project that genuinely has no
 * manifests doesn't pay the disk-walk cost on every keystroke.
 */
export const MAX_EXTERNAL_LOAD_RETRIES = 3;
