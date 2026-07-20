#!/usr/bin/env bash
# Compile and run every extracted snippet; fail if any fails.
# Expects tools/extract-snippets.mjs to have populated snippets-build/.
set -u
FAIL=0; PASS=0
declare -a FAILURES=()

run() { # label, workdir, cmd...
  local label="$1"; shift
  local dir="$1"; shift
  if (cd "$dir" && "$@") >/tmp/snip.log 2>&1; then
    PASS=$((PASS+1)); echo "OK   $label"
  else
    FAIL=$((FAIL+1)); FAILURES+=("$label")
    echo "FAIL $label"; sed 's/^/     /' /tmp/snip.log | head -8
  fi
}

for f in $(find snippets-build -name '*.py' | sort); do
  run "python  $f" . python3 "$f"; done
for f in $(find snippets-build -name '*.js' | sort); do
  run "node    $f" . node "$f"; done
for f in $(find snippets-build -name '*.ts' | sort); do
  d=$(dirname "$f"); b=$(basename "$f")
  run "tsc+run $f" "$d" bash -c \
    "npx --yes typescript@5.6 --target es2020 --module commonjs --outDir out '$b' >/dev/null 2>&1 || npx --yes -p typescript@5.6 tsc --target es2020 --module commonjs --outDir out '$b'; node out/*.js"
done
for f in $(find snippets-build -name '*.cpp' | sort); do
  d=$(dirname "$f")
  run "g++     $f" "$d" bash -c "g++ -std=c++17 -O1 -o snip_bin '$(basename "$f")' && ./snip_bin"
done
for f in $(find snippets-build -name '*.java' | sort); do
  d=$(dirname "$f"); b=$(basename "$f")
  run "java    $f" "$d" bash -c "javac '$b' && java '${b%.java}'"
done
for f in $(find snippets-build -name '*.rs' | sort); do
  d=$(dirname "$f")
  run "rustc   $f" "$d" bash -c "rustc --edition 2021 -o snip_bin '$(basename "$f")' && ./snip_bin"
done
for f in $(find snippets-build -name '*.go' | sort); do
  d=$(dirname "$f")
  run "go      $f" "$d" go run "$(basename "$f")"
done

echo
echo "snippets: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then printf 'failed: %s\n' "${FAILURES[@]}"; exit 1; fi
