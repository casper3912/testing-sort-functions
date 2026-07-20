#!/usr/bin/env bash
# Build one cumulative program per language from the page's snippets, then
# compile and RUN each with an asserting driver.
#
# The snippets are pedagogical fragments in dependency order — later ones call
# functions defined in earlier ones — so per-fragment compilation is the wrong
# check (compiled languages fail on unresolved symbols; interpreted ones "pass"
# without executing anything). A pass here means: a reader who copies the
# snippets in page order gets working code in that language, verified by a
# driver that catches a deliberately broken sort and shrinks its counterexample.
set -u
node tools/extract-snippets.mjs || exit 1
node tools/build-program.mjs || exit 1

P=snippets-build/_program
FAIL=0; PASS=0
declare -a FAILURES=()

run() { # label, cmd...
  local label="$1"; shift
  if "$@" >/tmp/snip.log 2>&1; then
    PASS=$((PASS+1)); echo "OK   $label"; tail -1 /tmp/snip.log | sed 's/^/     /'
  else
    FAIL=$((FAIL+1)); FAILURES+=("$label")
    echo "FAIL $label"; sed 's/^/     /' /tmp/snip.log | head -15
  fi
}

run "python"     python3 "$P/python/program.py"
run "javascript" node "$P/javascript/program.js"
run "typescript" bash -c "cd '$P/typescript' && npx --yes -p typescript@5.6 tsc --target es2020 --module commonjs --outDir out program.ts && node out/program.js"
run "cpp"        bash -c "cd '$P/cpp' && g++ -std=c++17 -O1 -o prog program.cpp && ./prog"
run "java"       bash -c "cd '$P/java' && javac *.java && java Driver"
run "rust"       bash -c "cd '$P/rust' && rustc --edition 2021 -o prog program.rs && ./prog"
run "go"         bash -c "cd '$P/go' && go test ./..."

echo
echo "cumulative snippet programs: $PASS/7 passed"
if [ "$FAIL" -gt 0 ]; then printf 'failed: %s\n' "${FAILURES[@]}"; exit 1; fi
