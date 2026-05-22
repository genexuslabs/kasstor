// Plain (non-component) module imported by `component-helper-deps.ts`.
// The "helper edit" spec mutates the exported constant to verify that
// editing a transitive dependency of a component still re-renders the
// component on the next SSR pass.

export const MARKER = "__placeholder_helper__";
