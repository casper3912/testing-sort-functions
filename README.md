# Testing Sort Functions

> An interactive, single-file guide to testing sort implementations **exhaustively** — by recursively generating *every* possible input when the value domain is finite or limited.

[![CI](https://github.com/YOUR-USERNAME/testing-sort-functions/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR-USERNAME/testing-sort-functions/actions/workflows/ci.yml)
[![Deploy](https://github.com/YOUR-USERNAME/testing-sort-functions/actions/workflows/pages.yml/badge.svg)](https://github.com/YOUR-USERNAME/testing-sort-functions/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**▶ [Read it live](https://YOUR-USERNAME.github.io/testing-sort-functions/)**

---

## The idea

Most sort tests check a handful of hand-picked inputs against hand-written expected outputs. That catches
the bugs you already thought of, and misses entire classes of the ones you didn't.

Two moves fix it:

1. **Assert properties, not fixed outputs.** A correct sort returns a list that is *ordered* **and** a
   *permutation of its input*. Neither alone is sufficient — returning `[0,1,2,…]` is always ordered;
   returning the input untouched is always a permutation.
2. **When values come from a small finite set, enumerate every input.** Finite value domain + bounded
   length ⇒ a finite input space ⇒ generate all of it recursively. Total coverage over a bounded space is
   a proof, not a sample.

## The lesson in one screenshot

The page ships four sort implementations — one correct, three subtly broken — and a live tester you point
at them. The headline result:

| Sort under test | vs. all **permutations** | vs. finite-alphabet **sequences** |
| --- | --- | --- |
| Drops duplicate values | ✅ **passes** — every one | ❌ fails instantly at `[0,0]` |

Permutations of *distinct* keys contain no repeats, so a sort that mishandles equal elements sails through
all `n!` of them. You need repeated values — which is exactly what enumerating `kⁿ` sequences over a tiny
alphabet gives you. That contrast is the whole argument for finite-domain testing, and you can reproduce it
in the browser in about ten seconds.

## What's inside

A single self-contained HTML file (~105 KB, zero dependencies, zero network calls):

- **13 sections** — the correctness oracle, the three testing strategies, exhaustive sequences (`kⁿ`),
  permutations (`n!`), combinations with repetition, test-space metrics, the 0–1 principle, the exhaustive
  harness, shrinking, edge cases, and a practical recipe.
- **5 interactive widgets** — an animated recursion tree for sequence generation, a permutation generator,
  a log-scale test-space calculator, a steppable 4-wire sorting network that verifies all 2⁴ binary inputs,
  and the live sort tester that finds minimal counterexamples.
- **Code in 7 languages** — Python, JavaScript, TypeScript, Java, C++, Rust, and Go, switchable page-wide,
  with copy buttons. Every generator, the oracle, the harness, and a shrinker.

## Quick start

No build step. No dependencies. Just open it:

```bash
git clone https://github.com/YOUR-USERNAME/testing-sort-functions.git
cd testing-sort-functions
open index.html          # macOS  (Linux: xdg-open · Windows: start)
```

## Tests

Two layers, so you get fast feedback without a browser and still do full visual review.

```bash
npm test                 # Node logic tests — no browser, no dependencies

npm install              # for the browser layers
npx playwright install chromium
npm run test:ui          # behavioral: widgets, language switch, tester matrix
npm run test:a11y        # accessibility affordances
npm run test:visual:update   # first visual run — creates baselines
npm run test:visual      # later runs — pixel-diff against baselines
```

| Suite | File | Browser? | Covers |
| --- | --- | --- | --- |
| Logic | `tests/engine.test.mjs` | no | Generators, oracle, 0–1 principle, buggy sorts, tester matrix, highlighter |
| Behavioral | `tests/ui.spec.js` | yes | The real widgets driven as a user would |
| Accessibility | `tests/a11y.spec.js` | yes | Skip link, ARIA state, labels, live regions, keyboard operability |
| Visual | `tests/visual.spec.js` | yes | Review screenshots + pixel-diff regression |

The logic tests read the shipped `index.html`, extract its `<script>`, and run the *actual* engine in a
`vm` sandbox — so they test what users get, not a copy. Full details in **[TESTING.md](TESTING.md)**.

## Project structure

```
.
├── index.html               # the entire guide — self-contained
├── tests/
│   ├── engine.test.mjs      # Node logic tests (no browser)
│   ├── ui.spec.js           # Playwright behavioral
│   ├── a11y.spec.js         # Playwright accessibility
│   ├── visual.spec.js       # Playwright visual review + regression
│   └── helper.js            # shared Playwright helpers
├── playwright.config.js
├── TESTING.md
└── .github/workflows/       # CI + GitHub Pages deploy
```

## Accessibility

Built against WCAG 2.2 AA and verified: all text meets 4.5:1 contrast and all non-text/UI meets 3:1;
`prefers-reduced-motion` is honored in both CSS and JS (animations jump to their final state); there's a
skip link, visible focus indicators, `aria-pressed` toggles, labelled controls, `aria-live` result regions,
and keyboard-operable sorting-network inputs. The growth chart encodes each series three ways — color,
dash pattern, and marker shape — plus direct labels, so it survives color-vision deficiency and grayscale.

## Setup after forking

1. Find-and-replace **`YOUR-USERNAME`** across `README.md` and `package.json` with your GitHub handle.
2. Enable Pages: **Settings → Pages → Source: GitHub Actions**. The next push to `main` publishes the site.
3. Update the copyright holder in [`LICENSE`](LICENSE) if needed.

## Further reading

- Knuth, *The Art of Computer Programming*, Vol. 3 §5.3.4 — sorting networks and the 0–1 principle
- Claessen & Hughes, ["QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs"](https://dl.acm.org/doi/10.1145/351240.351266) (2000)
- [Hypothesis](https://hypothesis.readthedocs.io/) (Python) and [fast-check](https://fast-check.dev/) (JS/TS) — property-based testing with shrinking
- de Gouw et al., ["OpenJDK's java.utils.Collection.sort() is broken"](https://www.cs.ru.nl/~chsmith/papers/CAV2015.pdf) — a real TimSort bug

## License

[MIT](LICENSE)
