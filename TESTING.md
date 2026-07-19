# Tests for `index.html`

Two layers, so you can get fast feedback without a browser and still do full
visual review:

| Layer | File | Needs a browser? | What it covers |
|---|---|---|---|
| **Logic** | `tests/engine.test.mjs` | No | The page's engine: generators, oracle, 0–1 network, buggy sorts, tester pass/fail matrix, highlighter, snippet completeness. |
| **Behavioral** | `tests/ui.spec.js` | Yes (Playwright) | The real widgets: language switch, copy button, sliders, sorting-network verify‑all, and the live tester bug × strategy matrix. |
| **Accessibility** | `tests/a11y.spec.js` | Yes (Playwright) | WCAG affordances: skip link, `aria-pressed` toggles, labelled controls, `aria-live` outputs, chart text alternative, keyboard-operable network inputs. |
| **Visual** | `tests/visual.spec.js` | Yes (Playwright) | Review screenshots of every widget + a 7‑language code gallery, plus pixel‑diff regression baselines. |

The page under test is a single self-contained file — the tests read it straight
off disk (`file://`), so there's nothing to build or serve.

---

## 1. Logic tests (no browser)

```bash
npm test
```

Runs on Node 18+ with zero dependencies. It extracts the `<script>` from the
HTML, evaluates the pure engine in a `vm` sandbox (via the `window.__sortguide`
surface), and asserts ~20 properties — including the guide's central lesson:

> the *drops-duplicates* sort passes **all** permutations of distinct keys, yet
> fails immediately on finite-alphabet sequences (minimal counterexample `[0,0]`).

## 2. Playwright tests (behavioral + visual)

One-time setup:

```bash
npm install
npx playwright install chromium      # add "firefox webkit" for cross-browser
```

Run them:

```bash
npm run test:ui                      # behavioral (tests/ui.spec.js)
npm run test:a11y                    # accessibility (tests/a11y.spec.js)
npm run test:visual:update           # FIRST visual run — creates baselines
npm run test:visual                  # subsequent runs — diffs against baselines
npm run test:pw                      # everything
npm run report                       # open the HTML report (screenshots + traces)
```

### Optional: full automated WCAG scan

`a11y.spec.js` covers the specific affordances added in the UX pass. For a broad
rule-based audit, add axe:

```bash
npm i -D @axe-core/playwright
```

```js
const { AxeBuilder } = require("@axe-core/playwright");
test("no automatically-detectable WCAG violations", async ({ page }) => {
  await page.goto(require("./helper").PAGE_URL);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});
```

### Visual review

`tests/visual.spec.js` writes human-review PNGs to **`screenshots/`** every run:

- `full-page.png`
- `widget-*.png` — the tree generator, permutation generator, calculator,
  sorting network, and the tester in a *failing* state (so the counterexample
  bars are visible)
- `code-sequences-<lang>.png` — the same snippet in all seven languages, to
  eyeball the syntax highlighting

It also captures **regression baselines** under
`tests/visual.spec.js-snapshots/`. Create them once with
`npm run test:visual:update`; after that, `npm run test:visual` fails if the
rendering drifts. Baselines are pixel-exact and OS/browser-specific — commit the
ones from the machine (or CI image) you'll compare against, and regenerate with
`--update-snapshots` after an intentional change.

---

## Notes

- `playwright.config.js` limits Playwright to `*.spec.js`, so the Node
  `engine.test.mjs` file is never picked up by Playwright (and vice-versa).
- Chromium runs headless with clipboard permission granted (for the copy-button
  test) and `reducedMotion` enabled (for stable screenshots).
- Only Chromium is enabled by default; uncomment the Firefox/WebKit projects in
  `playwright.config.js` after installing those browsers.
- `screenshots/`, `test-results/`, and `playwright-report/` are git-ignored;
  the regression baselines under `tests/*-snapshots/` are not.
