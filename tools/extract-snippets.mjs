#!/usr/bin/env node
// Extract every embedded code snippet from index.html into real files so CI
// can compile and run all seven languages — closing the project's
// "Java/Rust/Go/TS snippets were never compiled" residual risk.
//
// Usage: node tools/extract-snippets.mjs [outDir=snippets-build]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const m0 = html.match(/const SNIPPETS\s*=/);
if (!m0) throw new Error("SNIPPETS not found");
const start = m0.index;

// walk from the first '{' matching braces, skipping ', ", ` strings
const open = html.indexOf("{", start);
let depth = 0, i = open, mode = null;
for (; i < html.length; i++) {
  const c = html[i], prev = html[i - 1];
  if (mode) {
    if (c === mode && prev !== "\\") mode = null;
    continue;
  }
  if (c === "'" || c === '"' || c === "`") { mode = c; continue; }
  if (c === "{") depth++;
  else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
}
const objSrc = html.slice(open, i);
const SNIPPETS = vm.runInNewContext("(" + objSrc + ")");

const EXT = { python: "py", javascript: "js", typescript: "ts",
              java: "java", cpp: "cpp", rust: "rs", go: "go" };
const outDir = process.argv[2] || "snippets-build";
fs.rmSync(outDir, { recursive: true, force: true });

let count = 0;
const manifest = [];
for (const [snip, langs] of Object.entries(SNIPPETS)) {
  for (const [lang, code] of Object.entries(langs)) {
    const ext = EXT[lang];
    if (!ext) continue;
    let base = `main.${ext}`;
    if (lang === "java") {
      const m = code.match(/(?:public\s+)?class\s+([A-Za-z_]\w*)/);
      base = `${m ? m[1] : "Main"}.java`;
    }
    const dir = path.join(outDir, snip, lang);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, base), code.endsWith("\n") ? code : code + "\n");
    manifest.push({ snip, lang, file: path.join(dir, base) });
    count++;
  }
}
fs.writeFileSync(path.join(outDir, "manifest.json"),
                 JSON.stringify(manifest, null, 1));
console.log(`extracted ${count} snippets (${Object.keys(SNIPPETS).length} topics) -> ${outDir}/`);
const byLang = {};
for (const m of manifest) byLang[m.lang] = (byLang[m.lang] || 0) + 1;
console.log(JSON.stringify(byLang));
