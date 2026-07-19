// Visual review + regression tests.
//
//   Review images  -> ./screenshots/*.png        (always written, for eyeballing)
//   Regression     -> tests/visual.spec.js-snapshots/   (baselines; diffed on later runs)
//
// First run, create the regression baselines:  npm run test:visual:update
// After that, `npm run test:visual` fails if the rendering drifts.
const { test, expect } = require("@playwright/test");
const { PAGE_URL, runTester } = require("./helper");
const path = require("path");
const fs = require("fs");

const SHOTS = path.resolve(process.cwd(), "screenshots");
test.beforeAll(() => fs.mkdirSync(SHOTS, { recursive: true }));
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE_URL);
});

test("full-page review screenshot", async ({ page }) => {
  await page.screenshot({ path: path.join(SHOTS, "full-page.png"), fullPage: true });
});

test("per-widget review screenshots", async ({ page }) => {
  const widgets = {
    hero: ".hero",
    "tree-generator": "#finite .lab",
    permutations: "#permutations .lab",
    "test-space-calculator": "#metrics .lab",
    "sorting-network": "#zeroone .lab",
  };
  for (const [name, sel] of Object.entries(widgets)) {
    const el = page.locator(sel);
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: path.join(SHOTS, `widget-${name}.png`) });
  }
});

test("tester counterexample review screenshot", async ({ page }) => {
  // Force a FAIL so the input/output bar comparison is on screen.
  await runTester(page, "dedup", "seq", 6);
  const lab = page.locator("#harness .lab");
  await lab.scrollIntoViewIfNeeded();
  await lab.screenshot({ path: path.join(SHOTS, "widget-tester-fail.png") });
});

test("code-snippet gallery across all seven languages", async ({ page }) => {
  const langs = ["python", "javascript", "typescript", "java", "cpp", "rust", "go"];
  const block = page.locator('.codeblock[data-snippet="sequences"]');
  await block.scrollIntoViewIfNeeded();
  for (const l of langs) {
    await page.click(`.langbar button[data-lang="${l}"]`);
    await block.screenshot({ path: path.join(SHOTS, `code-sequences-${l}.png`) });
  }
});

// ---- Visual regression (baselines committed under tests/visual.spec.js-snapshots/) ----
test.describe("visual regression", () => {
  test("hero banner", async ({ page }) => {
    await expect(page.locator(".hero")).toHaveScreenshot("hero.png");
  });

  test("oracle code block (Python)", async ({ page }) => {
    await page.click('.langbar button[data-lang="python"]');
    await expect(page.locator('.codeblock[data-snippet="oracle"]')).toHaveScreenshot("oracle-python.png");
  });

  test("reference counts table", async ({ page }) => {
    const t = page.locator("#reference .tablewrap").first();
    await t.scrollIntoViewIfNeeded();
    await expect(t).toHaveScreenshot("reference-counts.png");
  });
});
