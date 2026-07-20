#!/usr/bin/env node
// Merge the extracted snippets into ONE cumulative program per language.
//
// The page's snippets are pedagogical fragments in dependency order
// (sequences -> permutations -> multisets -> oracle -> shrink -> harness);
// later fragments call functions defined in earlier ones, so compiling them
// in isolation can never succeed — and running an interpreted fragment that
// only *defines* functions proves nothing. Merging in page order and then
// running an asserting driver verifies the promise a reader actually relies
// on: "copy the snippets in order and you get working code."
//
// Usage: node tools/build-program.mjs [buildDir=snippets-build]
import fs from "node:fs";
import path from "node:path";

const buildDir = process.argv[2] || "snippets-build";
const outRoot = path.join(buildDir, "_program");
const ORDER = ["sequences", "permutations", "multisets", "oracle", "shrink", "harness"];
const LANGS = {
  python: "main.py", javascript: "main.js", typescript: "main.ts",
  cpp: "main.cpp", rust: "main.rs", go: "main.go",
};
const JAVA_CLASSES = {
  sequences: "Sequences", permutations: "Permutations", multisets: "Multisets",
  oracle: "SortOracle", shrink: "Shrink", harness: "Harness",
};

function fragment(topic, lang, file) {
  const p = path.join(buildDir, topic, lang, file);
  if (!fs.existsSync(p)) throw new Error(`missing fragment: ${p} — page structure changed?`);
  const code = fs.readFileSync(p, "utf8");
  if (/\b(int main\s*\(|fn main\s*\(|func main\s*\()/.test(code))
    throw new Error(`${p} now contains its own main() — cumulative merge needs updating`);
  return code;
}

function merged(lang, file, { strip = [], hoist = [] } = {}) {
  const parts = [];
  const hoisted = new Set(hoist);
  for (const topic of ORDER) {
    const lines = fragment(topic, lang, file).split("\n").filter(l => {
      if (strip.some(re => re.test(l))) { hoisted.add(l.trim()); return false; }
      return true;
    });
    parts.push(`// --- ${topic} ---\n${lines.join("\n").trim()}\n`);
  }
  return [...hoisted].join("\n") + "\n\n" + parts.join("\n");
}

function emit(lang, name, content) {
  const dir = path.join(outRoot, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), content.endsWith("\n") ? content : content + "\n");
}

fs.rmSync(outRoot, { recursive: true, force: true });

// ---------- python ----------
emit("python", "program.py", merged("python", "main.py").replace(/^\/\/ --- /gm, "# --- ") + `

# --- driver (CI only, not part of the page) ---
if __name__ == "__main__":
    good = lambda xs: sorted(xs)
    bad = lambda xs: list(xs)                    # identity: forgets to sort
    assert test_sort_exhaustive(good, [0, 1, 2], 5) is None, "good sort must pass"
    cx = test_sort_exhaustive(bad, [0, 1, 2], 5)
    assert cx is not None, "identity sort must be caught"
    small = shrink(bad, cx)
    assert len(small) == 2 and small[0] > small[1], f"shrink minimal: {small}"
    assert len(list(sequences([0, 1], 3))) == 8, "2^3 sequences"
    assert len(list(permutations([1, 2, 3]))) == 6, "3! permutations"
    assert len(list(multisets([0, 1, 2], 2))) == 6, "C(4,2) multisets"
    assert is_sorted([1, 2, 2]) and not is_sorted([2, 1]), "oracle sanity"
    assert is_correct_sort(good, [3, 1, 2]) and not is_correct_sort(bad, [3, 1, 2])
    print("python: all driver assertions passed")
`);

// ---------- javascript ----------
emit("javascript", "program.js", merged("javascript", "main.js") + `

// --- driver (CI only, not part of the page) ---
function check(cond, msg) { if (!cond) throw new Error("FAIL: " + msg); }
const good = xs => xs.slice().sort((a, b) => a - b);
const bad = xs => xs.slice();                    // identity: forgets to sort
check(testSortExhaustive(good, [0, 1, 2], 5) === null, "good sort must pass");
const cx = testSortExhaustive(bad, [0, 1, 2], 5);
check(cx !== null, "identity sort must be caught");
const small = shrink(bad, cx);
check(small.length === 2 && small[0] > small[1], "shrink minimal: " + JSON.stringify(small));
check([...sequences([0, 1], 3)].length === 8, "2^3 sequences");
check([...permutations([1, 2, 3])].length === 6, "3! permutations");
check([...multisets([0, 1, 2], 2)].length === 6, "C(4,2) multisets");
check(isSorted([1, 2, 2]) && !isSorted([2, 1]), "oracle sanity");
check(isCorrectSort(good, [3, 1, 2]) && !isCorrectSort(bad, [3, 1, 2]), "isCorrectSort");
console.log("javascript: all driver assertions passed");
`);

// ---------- typescript ----------
emit("typescript", "program.ts", merged("typescript", "main.ts") + `

// --- driver (CI only, not part of the page) ---
function check(cond: boolean, msg: string): void { if (!cond) throw new Error("FAIL: " + msg); }
const good: SortFn<number> = xs => xs.slice().sort((a, b) => a - b);
const bad: SortFn<number> = xs => xs.slice();    // identity: forgets to sort
check(testSortExhaustive(good, [0, 1, 2], 5) === null, "good sort must pass");
const cx = testSortExhaustive(bad, [0, 1, 2], 5);
check(cx !== null, "identity sort must be caught");
const small = shrink(bad, cx as number[]);
check(small.length === 2 && small[0] > small[1], "shrink minimal: " + JSON.stringify(small));
check([...sequences([0, 1], 3)].length === 8, "2^3 sequences");
check([...permutations([1, 2, 3])].length === 6, "3! permutations");
check([...multisets([0, 1, 2], 2)].length === 6, "C(4,2) multisets");
check(isSorted([1, 2, 2]) && !isSorted([2, 1]), "oracle sanity");
check(isCorrectSort(good, [3, 1, 2]) && !isCorrectSort(bad, [3, 1, 2]), "isCorrectSort");
console.log("typescript: all driver assertions passed");
`);

// ---------- cpp ----------
emit("cpp", "program.cpp",
  merged("cpp", "main.cpp", {
    strip: [/^#include\s*</, /^using namespace std;/],
    hoist: ["#include <cstdio>", "#include <cstdlib>"],
  }) + `

// --- driver (CI only, not part of the page) ---
static void check(bool cond, const char* msg) {
    if (!cond) { fprintf(stderr, "FAIL: %s\\n", msg); exit(1); }
}
int main() {
    function<vector<int>(vector<int>)> good =
        [](vector<int> v) { std::sort(v.begin(), v.end()); return v; };
    function<vector<int>(vector<int>)> bad =
        [](vector<int> v) { return v; };         // identity: forgets to sort
    check(!test_sort_exhaustive(good, {0, 1, 2}, 5).has_value(), "good sort must pass");
    auto cx = test_sort_exhaustive(bad, {0, 1, 2}, 5);
    check(cx.has_value(), "identity sort must be caught");
    auto smallest = shrink(bad, *cx);
    check(smallest.size() == 2 && smallest[0] > smallest[1], "shrink minimal");
    check(sequences({0, 1}, 3).size() == 8, "2^3 sequences");
    check(permutations({1, 2, 3}).size() == 6, "3! permutations");
    check(multisets({0, 1, 2}, 2).size() == 6, "C(4,2) multisets");
    check(is_sorted_seq({1, 2, 2}) && !is_sorted_seq({2, 1}), "oracle sanity");
    puts("cpp: all driver assertions passed");
    return 0;
}
`);

// ---------- rust ----------
emit("rust", "program.rs", merged("rust", "main.rs", { strip: [/^use\s/] }) + `

// --- driver (CI only, not part of the page) ---
fn main() {
    let good = |mut v: Vec<i32>| { v.sort(); v };
    let bad = |v: Vec<i32>| v;                   // identity: forgets to sort
    assert!(test_sort_exhaustive(good, &[0, 1, 2], 5).is_none(), "good sort must pass");
    let cx = test_sort_exhaustive(bad, &[0, 1, 2], 5).expect("identity sort must be caught");
    let smallest = shrink(bad, cx);
    assert!(smallest.len() == 2 && smallest[0] > smallest[1], "shrink minimal: {:?}", smallest);
    assert_eq!(sequences(&[0, 1], 3).len(), 8, "2^3 sequences");
    assert_eq!(permutations(&[1, 2, 3]).len(), 6, "3! permutations");
    assert_eq!(multisets(&[0, 1, 2], 2).len(), 6, "C(4,2) multisets");
    assert!(is_sorted(&[1, 2, 2]) && !is_sorted(&[2, 1]), "oracle sanity");
    println!("rust: all driver assertions passed");
}
`);

// ---------- java: compile the classes together + a driver ----------
for (const topic of ORDER) {
  const cls = JAVA_CLASSES[topic];
  emit("java", `${cls}.java`, fragment(topic, "java", `${cls}.java`));
}
emit("java", "Driver.java", `import java.util.*;
import java.util.function.UnaryOperator;

// CI driver (not part of the page): exercises the snippet classes together.
class Driver {
    static void check(boolean cond, String msg) {
        if (!cond) { System.err.println("FAIL: " + msg); System.exit(1); }
    }
    public static void main(String[] args) {
        UnaryOperator<int[]> good = xs -> { int[] c = xs.clone(); Arrays.sort(c); return c; };
        UnaryOperator<int[]> bad = xs -> xs.clone();   // identity: forgets to sort
        check(Harness.testSortExhaustive(good, new int[]{0, 1, 2}, 5) == null, "good sort must pass");
        int[] cx = Harness.testSortExhaustive(bad, new int[]{0, 1, 2}, 5);
        check(cx != null, "identity sort must be caught");
        int[] small = Shrink.shrink(bad, cx);
        check(small.length == 2 && small[0] > small[1], "shrink minimal: " + Arrays.toString(small));
        check(Sequences.sequences(new int[]{0, 1}, 3).size() == 8, "2^3 sequences");
        check(Permutations.permutations(new int[]{1, 2, 3}).size() == 6, "3! permutations");
        check(Multisets.multisets(new int[]{0, 1, 2}, 2).size() == 6, "C(4,2) multisets");
        check(SortOracle.isSorted(new int[]{1, 2, 2}) && !SortOracle.isSorted(new int[]{2, 1}), "oracle sanity");
        System.out.println("java: all driver assertions passed");
    }
}
`);

// ---------- go: package gen + a test-file driver ----------
for (const topic of ORDER) emit("go", `${topic}.go`, fragment(topic, "go", "main.go"));
emit("go", "go.mod", "module snippets\n\ngo 1.22\n");
emit("go", "driver_test.go", `package gen

// CI driver (not part of the page): exercises the snippet package.
import (
    "sort"
    "testing"
)

func TestSnippets(t *testing.T) {
    good := func(xs []int) []int { c := append([]int(nil), xs...); sort.Ints(c); return c }
    bad := func(xs []int) []int { return append([]int(nil), xs...) } // identity
    if TestSortExhaustive(good, []int{0, 1, 2}, 5) != nil {
        t.Fatal("good sort must pass")
    }
    cx := TestSortExhaustive(bad, []int{0, 1, 2}, 5)
    if cx == nil {
        t.Fatal("identity sort must be caught")
    }
    small := Shrink(bad, cx)
    if len(small) != 2 || small[0] <= small[1] {
        t.Fatalf("shrink minimal: %v", small)
    }
    if len(Sequences([]int{0, 1}, 3)) != 8 {
        t.Fatal("2^3 sequences")
    }
    if len(Permutations([]int{1, 2, 3})) != 6 {
        t.Fatal("3! permutations")
    }
    if len(Multisets([]int{0, 1, 2}, 2)) != 6 {
        t.Fatal("C(4,2) multisets")
    }
    if !IsSorted([]int{1, 2, 2}) || IsSorted([]int{2, 1}) {
        t.Fatal("oracle sanity")
    }
}
`);

console.log(`built cumulative programs for 7 languages -> ${outRoot}/`);
