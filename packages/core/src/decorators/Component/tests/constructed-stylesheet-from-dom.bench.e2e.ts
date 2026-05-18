// Real-browser benchmark for `createConstructedStyleSheetFromDomStyleSheet`.
//
// Several candidate implementations are timed against a real DOM CSSStyleSheet
// (created by injecting a `<style>` element). Each implementation must produce
// a constructed CSSStyleSheet with the same rules as the source.
//
// Runs in Chromium headless via the project's vitest browser harness.
//
// The final `console.table` shows median runtime per (impl, size) pair and the
// winners — that's the comparative table the audit asks for.

import { afterAll, describe, expect, test } from "vitest";

// ---------------------------------------------------------------------------
// Candidate implementations
// ---------------------------------------------------------------------------

type Impl = (sheet: CSSStyleSheet) => CSSStyleSheet;

/** A — Current implementation: for…of + `+=` concat. */
const implA_forOfPlusEquals: Impl = sheet => {
  const out = new CSSStyleSheet();
  let css = "";
  for (const r of sheet.cssRules) {
    css += r.cssText;
  }
  out.replaceSync(css);
  return out;
};

/** B — for…of + array.push + join(""). */
const implB_forOfPushJoin: Impl = sheet => {
  const out = new CSSStyleSheet();
  const parts: string[] = [];
  for (const r of sheet.cssRules) {
    parts.push(r.cssText);
  }
  out.replaceSync(parts.join(""));
  return out;
};

/** C — Indexed for-loop with cached length, `+=` concat. */
const implC_indexedPlusEquals: Impl = sheet => {
  const out = new CSSStyleSheet();
  const rules = sheet.cssRules;
  const len = rules.length;
  let css = "";
  for (let i = 0; i < len; i++) {
    css += rules[i].cssText;
  }
  out.replaceSync(css);
  return out;
};

/** D — Indexed for-loop with cached length, push to array, then join. */
const implD_indexedPushJoin: Impl = sheet => {
  const out = new CSSStyleSheet();
  const rules = sheet.cssRules;
  const len = rules.length;
  const parts: string[] = [];
  for (let i = 0; i < len; i++) {
    parts.push(rules[i].cssText);
  }
  out.replaceSync(parts.join(""));
  return out;
};

/** E — Array.from + map + join. */
const implE_arrayFromMapJoin: Impl = sheet => {
  const out = new CSSStyleSheet();
  const css = Array.from(sheet.cssRules, r => r.cssText).join("");
  out.replaceSync(css);
  return out;
};

/** F — Insert rules one by one with `insertRule` (no aggregate string). */
const implF_insertRule: Impl = sheet => {
  const out = new CSSStyleSheet();
  const rules = sheet.cssRules;
  const len = rules.length;
  for (let i = 0; i < len; i++) {
    // Append at the end to preserve order.
    out.insertRule(rules[i].cssText, i);
  }
  return out;
};

/** G — Pre-allocated Array(len) with index assignment, then join. */
const implG_preallocJoin: Impl = sheet => {
  const out = new CSSStyleSheet();
  const rules = sheet.cssRules;
  const len = rules.length;
  const parts = new Array<string>(len);
  for (let i = 0; i < len; i++) {
    parts[i] = rules[i].cssText;
  }
  out.replaceSync(parts.join(""));
  return out;
};

const implementations: { name: string; fn: Impl }[] = [
  { name: "A · current (for…of, +=)", fn: implA_forOfPlusEquals },
  { name: "B · for…of + push + join", fn: implB_forOfPushJoin },
  { name: "C · indexed for + +=", fn: implC_indexedPlusEquals },
  { name: "D · indexed for + push + join", fn: implD_indexedPushJoin },
  { name: "E · Array.from + map + join", fn: implE_arrayFromMapJoin },
  { name: "F · insertRule per rule", fn: implF_insertRule },
  { name: "G · prealloc Array(len) + join", fn: implG_preallocJoin }
];

// ---------------------------------------------------------------------------
// CSS source generator + DOM sheet builder
// ---------------------------------------------------------------------------

/** Builds a CSS string with `n` realistic-looking rules (a mix of simple and
 *  multi-declaration rules, to stress both rule count and per-rule text size). */
function buildCssSource(n: number): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    // Alternate between a small and a heavier rule so the average looks like
    // real-world UI CSS, not a single trivial selector.
    if (i % 3 === 0) {
      out.push(`.cls-${i}{color:rgb(${i % 255},${(i * 7) % 255},${(i * 13) % 255});}`);
    } else if (i % 3 === 1) {
      out.push(
        `.heavy-${i}{display:flex;align-items:center;justify-content:space-between;` +
          `padding:8px 12px;margin:4px 0;border:1px solid #ccc;border-radius:4px;` +
          `font-size:14px;line-height:1.5;color:#333;background:#fafafa;}`
      );
    } else {
      out.push(
        `.host-${i} > .child[data-role="${i}"]:hover,` +
          `.host-${i} > .child[data-role="${i}"]:focus-visible{` +
          `outline:2px solid rgb(${(i * 3) % 255}, ${(i * 5) % 255}, ${(i * 11) % 255});` +
          `transform:translateY(-1px);}`
      );
    }
  }
  return out.join("\n");
}

const createdStyleElements: HTMLStyleElement[] = [];

/** Creates a `<style>` element in document.head with `n` rules and returns its
 *  live DOM CSSStyleSheet. */
function createDomStyleSheet(n: number): CSSStyleSheet {
  const style = document.createElement("style");
  style.textContent = buildCssSource(n);
  document.head.appendChild(style);
  createdStyleElements.push(style);

  const sheet = style.sheet;
  if (!sheet) {
    throw new Error("Failed to obtain CSSStyleSheet from <style> element");
  }
  // Sanity: the browser parsed the expected number of rules.
  if (sheet.cssRules.length !== n) {
    throw new Error(`Expected ${n} rules, got ${sheet.cssRules.length}`);
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// Benchmark harness
// ---------------------------------------------------------------------------

interface BenchSpec {
  /** Human-readable label for the size bucket. */
  label: string;
  /** Number of rules in the source sheet. */
  ruleCount: number;
  /** How many timed samples per implementation. */
  samples: number;
  /** How many back-to-back calls per sample. Needed because the browser's
   *  `performance.now()` resolution (~0.1 ms after Spectre mitigations) is
   *  too coarse to time a single small call — batching brings each sample
   *  well above the resolution floor. */
  batch: number;
  /** Warmup runs (not measured) — let V8 settle on a single shape. */
  warmup: number;
}

const benchSpecs: BenchSpec[] = [
  // small: each call is sub-millisecond, so we batch a lot.
  { label: "small (10)", ruleCount: 10, samples: 30, batch: 2_000, warmup: 50 },
  { label: "medium (100)", ruleCount: 100, samples: 30, batch: 200, warmup: 20 },
  { label: "large (1 000)", ruleCount: 1_000, samples: 30, batch: 20, warmup: 5 },
  // huge: each call is ~15 ms — well above the resolution floor, no batching needed.
  { label: "huge (5 000)", ruleCount: 5_000, samples: 25, batch: 1, warmup: 3 }
];

/** Returns the median of an array (mutates by sorting). */
function median(samples: number[]): number {
  samples.sort((a, b) => a - b);
  const mid = samples.length >> 1;
  return samples.length % 2 === 0 ? (samples[mid - 1] + samples[mid]) / 2 : samples[mid];
}

function mean(samples: number[]): number {
  let s = 0;
  for (const x of samples) {
    s += x;
  }
  return s / samples.length;
}

interface BenchResult {
  size: string;
  impl: string;
  /** Median per-call time, in milliseconds. */
  medianMs: number;
  /** Mean per-call time, in milliseconds. */
  meanMs: number;
  /** Fastest per-call time, in milliseconds. */
  minMs: number;
  samples: number;
  batch: number;
  rules: number;
}

/** Runs `samples` timed batches of `batch` calls each. Returns per-call
 *  timings (a batch sample divided by `batch`), so all sizes are comparable. */
function timeOne(
  fn: Impl,
  sheet: CSSStyleSheet,
  samples: number,
  batch: number,
  warmup: number
) {
  // Sink prevents the engine from dead-code-eliminating the calls.
  let sink = 0;

  for (let w = 0; w < warmup; w++) {
    sink += fn(sheet).cssRules.length;
  }

  const perCallSamples = new Array<number>(samples);
  for (let s = 0; s < samples; s++) {
    const t0 = performance.now();
    for (let b = 0; b < batch; b++) {
      sink += fn(sheet).cssRules.length;
    }
    const t1 = performance.now();
    perCallSamples[s] = (t1 - t0) / batch;
  }

  if (sink < 0) {
    throw new Error("never");
  }
  return perCallSamples;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterAll(() => {
  for (const el of createdStyleElements) {
    el.remove();
  }
  createdStyleElements.length = 0;
});

describe("[design-system]", () => {
  describe("[createConstructedStyleSheetFromDomStyleSheet]", () => {
    test("all candidate implementations produce equivalent output", () => {
      const sheet = createDomStyleSheet(50);
      const expectedRuleCount = sheet.cssRules.length;

      // The current impl is the reference: build its concatenated cssText so
      // we can compare each candidate against the same canonical output.
      const referenceCss = (() => {
        let css = "";
        for (const r of sheet.cssRules) {
          css += r.cssText;
        }
        return css;
      })();

      for (const { name, fn } of implementations) {
        const out = fn(sheet);
        expect(out, `${name}: must return a CSSStyleSheet`).toBeInstanceOf(CSSStyleSheet);
        expect(out, `${name}: must be a NEW sheet (not the input)`).not.toBe(sheet);
        expect(out.cssRules.length, `${name}: rule count`).toBe(expectedRuleCount);

        let actual = "";
        for (const r of out.cssRules) {
          actual += r.cssText;
        }
        expect(actual, `${name}: serialized CSS must match the reference`).toBe(referenceCss);
      }
    });

    test("benchmark all implementations across multiple sheet sizes", () => {
      const results: BenchResult[] = [];

      for (const spec of benchSpecs) {
        const sheet = createDomStyleSheet(spec.ruleCount);
        const ruleCount = sheet.cssRules.length;

        for (const { name, fn } of implementations) {
          const perCall = timeOne(fn, sheet, spec.samples, spec.batch, spec.warmup);
          results.push({
            size: spec.label,
            impl: name,
            medianMs: median(perCall),
            meanMs: mean(perCall),
            minMs: Math.min(...perCall),
            samples: spec.samples,
            batch: spec.batch,
            rules: ruleCount
          });
        }
      }

      // ---- Pretty-print: one table per size, with relative-speed column -----
      const bySize = new Map<string, BenchResult[]>();
      for (const r of results) {
        const bucket = bySize.get(r.size) ?? [];
        bucket.push(r);
        bySize.set(r.size, bucket);
      }

      // Track per-size winners for the final summary.
      const winners: { size: string; impl: string; medianMs: number }[] = [];

      const log = (msg: string) => {
        // eslint-disable-next-line no-console
        console.log(msg);
      };

      /** Renders an array of records as a fixed-width ASCII table. */
      function renderTable<T extends Record<string, unknown>>(rows: T[]): string {
        if (rows.length === 0) {
          return "(no rows)";
        }
        const cols = Object.keys(rows[0]);
        const widths = cols.map(c =>
          Math.max(c.length, ...rows.map(r => String(r[c]).length))
        );
        const sep = "+" + widths.map(w => "-".repeat(w + 2)).join("+") + "+";
        const fmt = (cells: string[]) =>
          "| " + cells.map((cell, i) => cell.padEnd(widths[i])).join(" | ") + " |";

        const lines: string[] = [];
        lines.push(sep);
        lines.push(fmt(cols));
        lines.push(sep);
        for (const row of rows) {
          lines.push(fmt(cols.map(c => String(row[c]))));
        }
        lines.push(sep);
        return lines.join("\n");
      }

      log("\n=== createConstructedStyleSheetFromDomStyleSheet — Chromium headless ===");

      for (const [size, rows] of bySize) {
        rows.sort((a, b) => a.medianMs - b.medianMs);
        const fastest = rows[0].medianMs;
        const view = rows.map(r => ({
          impl: r.impl,
          "median (ms/call)": r.medianMs.toFixed(5),
          "mean (ms/call)": r.meanMs.toFixed(5),
          "min (ms/call)": r.minMs.toFixed(5),
          "x slower":
            fastest > 0 ? (r.medianMs / fastest).toFixed(2) : "—",
          batch: String(r.batch),
          samples: String(r.samples),
          rules: String(r.rules)
        }));
        log(`\n--- size: ${size} (${rows[0].rules} rules) ---`);
        log(renderTable(view));

        winners.push({ size, impl: rows[0].impl, medianMs: rows[0].medianMs });
      }

      // ---- Aggregate winner across all sizes ----------------------------------
      // Score each impl by its geometric-mean slowdown vs the per-size winner.
      const implNames = implementations.map(i => i.name);
      const slowdownByImpl = new Map<string, number[]>();
      for (const name of implNames) {
        slowdownByImpl.set(name, []);
      }
      for (const [, rows] of bySize) {
        const fastest = Math.min(...rows.map(r => r.medianMs));
        // Guard against any zero (shouldn't happen now that we batch, but keep it safe).
        if (fastest <= 0) {
          continue;
        }
        for (const r of rows) {
          slowdownByImpl.get(r.impl)!.push(r.medianMs / fastest);
        }
      }
      const overall = Array.from(slowdownByImpl.entries())
        .filter(([, s]) => s.length > 0)
        .map(([impl, slowdowns]) => {
          const geoMean = Math.exp(
            slowdowns.reduce((acc, x) => acc + Math.log(x), 0) / slowdowns.length
          );
          return { impl, "geomean x slower": geoMean.toFixed(3) };
        })
        .sort(
          (a, b) =>
            parseFloat(a["geomean x slower"]) - parseFloat(b["geomean x slower"])
        );

      log("\n--- overall ranking (geo-mean slowdown vs per-size winner) ---");
      log(renderTable(overall));

      log("\n--- per-size winners ---");
      log(
        renderTable(
          winners.map(w => ({
            size: w.size,
            impl: w.impl,
            "median (ms/call)": w.medianMs.toFixed(5)
          }))
        )
      );

      // Sanity: there is a measurable winner per size (timings recorded).
      expect(winners.length).toBe(benchSpecs.length);
      for (const w of winners) {
        expect(w.medianMs).toBeGreaterThanOrEqual(0);
      }
    }, 120_000);
  });
});
