/**
 * Tiny ANSI escape-code helpers for terminal output. Replaces the `chalk`
 * dependency for the four colors / styles the CLI actually uses
 * (`red`, `yellow`, `gray`, `black`, `bgRedBright`, `bgYellow`, `bold`,
 * `underline`).
 *
 * Why hand-roll instead of using chalk:
 *   - The CLI exercises ~10 styles, all available as plain ANSI sequences.
 *   - Chalk pulls in `ansi-styles`, `color-convert`, `color-name`, and
 *     `supports-color` — four extra packages for what ends up being a
 *     handful of escape strings.
 *   - The output is identical to chalk's for the styles we use.
 *
 * Color detection: respects `NO_COLOR` (https://no-color.org) and
 * `FORCE_COLOR=1`. When stdout is not a TTY, colors are off.
 */

const ESC = "\x1b[";
const RESET = `${ESC}0m`;

/**
 * Whether the current process should emit color escape codes.
 *
 * Resolved once at module load — the analyzer CLI runs as a single
 * short-lived process so re-evaluating per call would only add overhead.
 * Tests that need to flip the value re-import after mutating the env.
 */
const colorEnabled: boolean = (() => {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout?.isTTY);
})();

function wrap(open: string, close: string, text: string): string {
  if (!colorEnabled) return text;
  return `${ESC}${open}m${text}${ESC}${close}m`;
}

// Foreground colors.
export const red = (s: string): string => wrap("31", "39", s);
export const green = (s: string): string => wrap("32", "39", s);
export const yellow = (s: string): string => wrap("33", "39", s);
export const black = (s: string): string => wrap("30", "39", s);
export const gray = (s: string): string => wrap("90", "39", s);

// Background colors.
export const bgRedBright = (s: string): string => wrap("101", "49", s);
export const bgYellow = (s: string): string => wrap("43", "49", s);

// Modifiers.
export const bold = (s: string): string => wrap("1", "22", s);
export const underline = (s: string): string => wrap("4", "24", s);

/** For tests: indicates whether the helpers are emitting escape codes. */
export const isColorEnabled = (): boolean => colorEnabled;

// Suppress "unused" lint warning on the reset constant — kept exported in
// case downstream consumers want to compose escapes manually.
void RESET;
