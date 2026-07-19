/**
 * Node logic tests for index.html — NO BROWSER REQUIRED.
 *
 *   Run:  node --test tests/engine.test.mjs      (from the project root)
 *   or:   npm test
 *
 * How it works: the page is self-contained, so we read the HTML, pull out the
 * <script>, drop the DOM-only init block, evaluate the pure engine in a Node
 * `vm` sandbox, and assert against it. This exercises the exact code that ships
 * in the page — the generators, the correctness oracle, the 0–1 principle
 * network, the (correct + buggy) sort implementations, the syntax highlighter,
 * and the completeness of the six-language code snippets.
 *
 * Note on equality: values returned from the sandbox are arrays from a *different*
 * realm, so their prototype isn't reference-equal to the host Array. We therefore
 * use `assert.deepEqual` (structural) for arrays and `assert.strictEqual` for
 * primitives and identity (null) checks.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, "..", "index.html"), "utf8");

const match = html.match(/<script>([\s\S]*)<\/script>/);
assert.ok(match, "page must contain exactly one <script> block");
let script = match[1];
const initAt = script.indexOf("/* ============================ init");
assert.ok(initAt > 0, "the init marker must exist in the page script");
script = script.slice(0, initAt); // drop DOM-only init + window hook

const ctx = { console, Math, JSON, Object, Array, Map, Set, String, Number, Boolean, isFinite, parseInt, parseFloat };
vm.createContext(ctx);
vm.runInContext(
  script +
    "\nglobalThis.__api={genSequences,genPerms,oSorted,oPerm,fact,multisetCount,fmtCount,applyNetwork,netValsAtStep,NET_COMPS,IMPLS,testerInputsForLength,buildTree,highlight,SNIPPETS,LANGS};",
  ctx
);
const A = ctx.__api;

/* Replicates the page's live tester loop: returns the first failing input
   (minimal length), or null if every input up to maxLen passes the oracle. */
function firstFail(impl, strategy, maxLen) {
  const sort = A.IMPLS[impl];
  for (let L = 1; L <= maxLen; L++) {
    for (const inp of A.testerInputsForLength(strategy, L)) {
      const out = sort(inp.slice());
      if (!(A.oSorted(out) && A.oPerm(inp, out))) return { L, inp, out };
    }
  }
  return null;
}

/* --------------------------- recursive generators --------------------------- */
test("sequences: k^n count", () => {
  assert.strictEqual(A.genSequences([0, 1], 3).length, 8);
  assert.strictEqual(A.genSequences([0, 1, 2], 4).length, 81);
  assert.strictEqual(A.genSequences([0, 1, 2], 0).length, 1); // one empty sequence
});
test("sequences: lexicographic generation order", () => {
  assert.deepEqual(A.genSequences([0, 1], 2), [[0, 0], [0, 1], [1, 0], [1, 1]]);
});
test("permutations: n! count and all distinct", () => {
  assert.strictEqual(A.genPerms([1, 2, 3, 4]).length, 24);
  assert.strictEqual(new Set(A.genPerms([1, 2, 3]).map((p) => p.join())).size, 6);
});

/* ------------------------------- the oracle -------------------------------- */
test("oSorted accepts non-decreasing, rejects otherwise", () => {
  assert.ok(A.oSorted([]) && A.oSorted([5]) && A.oSorted([0, 1, 1, 2]));
  assert.ok(!A.oSorted([1, 0]) && !A.oSorted([0, 2, 1]));
});
test("oPerm is a true multiset equality", () => {
  assert.ok(A.oPerm([1, 2, 2], [2, 1, 2]));
  assert.ok(!A.oPerm([1, 2, 2], [1, 2])); // dropped duplicate
  assert.ok(!A.oPerm([0, 0], [0, 1])); // changed element
  assert.ok(!A.oPerm([1, 2], [1, 2, 3])); // different length
});

/* --------------------------- counts & formatting --------------------------- */
test("fact / multisetCount match the reference table", () => {
  assert.strictEqual(A.fact(10), 3628800);
  assert.strictEqual(A.multisetCount(10, 3), 66); // C(12,2)
  assert.strictEqual(A.multisetCount(4, 3), 15); // C(6,2)
  assert.strictEqual(A.multisetCount(20, 3), 231); // C(22,2)
});
test("fmtCount: commas below 1e9, scientific above", () => {
  assert.strictEqual(A.fmtCount(1024), "1,024");
  assert.strictEqual(A.fmtCount(3628800), "3,628,800");
  assert.match(A.fmtCount(5e9), /×10/);
});

/* ---------------------- 0–1 principle sorting network ---------------------- */
test("network sorts all 2^4 binary inputs (the premise of the 0–1 principle)", () => {
  for (let m = 0; m < 16; m++) {
    const bits = [(m >> 3) & 1, (m >> 2) & 1, (m >> 1) & 1, m & 1];
    assert.ok(A.oSorted(A.applyNetwork(bits)), `binary ${bits} not sorted`);
  }
});
test("0–1 principle holds: sorting all binary ⇒ sorts arbitrary values", () => {
  for (let t = 0; t < 20000; t++) {
    const v = [0, 1, 2, 3].map(() => (Math.random() * 12) | 0);
    assert.deepEqual(
      A.applyNetwork(v),
      v.slice().sort((a, b) => a - b)
    );
  }
});
test("netValsAtStep advances through all comparators", () => {
  const end = A.netValsAtStep([1, 0, 1, 0], A.NET_COMPS.length);
  assert.ok(A.oSorted(end));
});

/* ----------------------- sort implementations (SUTs) ----------------------- */
test("correct insertion sort is correct", () => {
  assert.deepEqual(A.IMPLS.correct([3, 1, 2, 1]), [1, 1, 2, 3]);
});
test("buggy sorts misbehave exactly as designed", () => {
  assert.deepEqual(A.IMPLS.dedup([1, 1, 2]), [1, 2]); // drops a duplicate
  assert.deepEqual(A.IMPLS.dedup([2, 1, 3]), [1, 2, 3]); // fine when distinct
  assert.deepEqual(A.IMPLS.offbyone([1, 0]), [1, 0]); // never fixes last
  assert.deepEqual(A.IMPLS.indices([5, 6, 7]), [0, 1, 2]); // ignores input
});

/* ------------------------- tester pass/fail matrix ------------------------- */
test("correct sort passes every strategy", () => {
  assert.strictEqual(firstFail("correct", "binary", 8), null);
  assert.strictEqual(firstFail("correct", "seq", 6), null);
  assert.strictEqual(firstFail("correct", "perm", 7), null);
});
test("THE LESSON: dedup passes ALL permutations but fails on repeats", () => {
  assert.strictEqual(firstFail("dedup", "perm", 7), null, "permutations of distinct keys hide the bug");
  assert.notStrictEqual(firstFail("dedup", "seq", 6), null, "sequences expose it");
  assert.notStrictEqual(firstFail("dedup", "binary", 8), null, "binary exposes it");
});
test("dedup's minimal counterexample is [0,0]", () => {
  const cx = firstFail("dedup", "binary", 8);
  assert.strictEqual(cx.L, 2);
  assert.deepEqual(cx.inp, [0, 0]);
});
test("off-by-one and index bugs are caught", () => {
  assert.notStrictEqual(firstFail("offbyone", "perm", 5), null);
  assert.notStrictEqual(firstFail("offbyone", "binary", 8), null);
  assert.notStrictEqual(firstFail("indices", "binary", 4), null);
  assert.notStrictEqual(firstFail("indices", "perm", 4), null); // perm inputs use 1..L
});

/* ------------------------------ recursion tree ----------------------------- */
test("buildTree node/leaf counts", () => {
  const t2 = A.buildTree(2, 3);
  assert.strictEqual(t2.leaves.length, 8); // 2^3
  assert.strictEqual(t2.nodes.length, 15); // 2^4 - 1
  assert.strictEqual(A.buildTree(3, 3).leaves.length, 27);
});

/* ---------------------------- syntax highlighter --------------------------- */
const CODE_LANGS = ["python", "javascript", "typescript", "java", "cpp", "rust", "go"];
const TOPICS = ["oracle", "sequences", "permutations", "multisets", "harness", "shrink"];
test("all 42 code snippets are present (6 topics × 7 languages)", () => {
  const missing = [];
  for (const t of TOPICS) for (const l of CODE_LANGS) if (!A.SNIPPETS[t]?.[l]) missing.push(`${t}/${l}`);
  assert.deepEqual(missing, []);
});
test("highlighter never throws and always escapes HTML", () => {
  for (const t of TOPICS)
    for (const l of CODE_LANGS) {
      const out = A.highlight(A.SNIPPETS[t][l], l);
      assert.match(out, /<span class=/, `${t}/${l} should emit spans`);
      // once spans are stripped, no raw angle bracket may remain (all source < > escaped)
      const stripped = out.replace(/<\/?span[^>]*>/g, "");
      assert.ok(!/[<>]/.test(stripped), `${t}/${l} left an unescaped angle bracket`);
    }
});
test("highlighter tags keywords", () => {
  assert.match(A.highlight("def f():\n    pass", "python"), /<span class="k">def<\/span>/);
});
