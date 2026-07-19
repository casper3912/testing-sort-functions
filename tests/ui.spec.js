// Behavioral Playwright tests — drive the real widgets in a real browser.
const { test, expect } = require("@playwright/test");
const { PAGE_URL, open, setRange, runTester } = require("./helper");

test.describe("page load", () => {
  test("title, hero, and no console errors", async ({ page }) => {
    const errors = await open(page);
    await expect(page).toHaveTitle(/Testing Sort Functions/);
    await expect(page.locator(".hero h1")).toContainText("test a sort");
    await page.waitForTimeout(250);
    expect(errors).toEqual([]);
  });

  test("all code blocks render highlighted", async ({ page }) => {
    await open(page);
    // six language-switchable snippets on the page
    await expect(page.locator(".codeblock pre code")).toHaveCount(6);
    await expect(page.locator(".codeblock").first().locator("span.k").first()).toBeVisible();
  });
});

test.describe("language switcher", () => {
  test("switching language updates every snippet header and body", async ({ page }) => {
    await open(page);
    const seq = page.locator('.codeblock[data-snippet="sequences"]');

    await page.click('.langbar button[data-lang="rust"]');
    await expect(seq.locator(".code-head .lang")).toHaveText("Rust");
    await expect(seq.locator(".code-head .file")).toHaveText("sequences.rs");
    await expect(seq.locator("code")).toContainText("fn sequences");

    await page.click('.langbar button[data-lang="go"]');
    await expect(seq.locator(".code-head .lang")).toHaveText("Go");
    await expect(seq.locator("code")).toContainText("func Sequences");
  });

  test("copy button gives feedback", async ({ page }) => {
    await open(page);
    const btn = page.locator(".codeblock .copy").first();
    await btn.click();
    await expect(btn).toContainText("Copied");
  });
});

test.describe("recursion-tree generator", () => {
  test("k^n count and rendered nodes", async ({ page }) => {
    await open(page);
    await setRange(page, "#tree-k", 2);
    await setRange(page, "#tree-n", 4);
    await expect(page.locator("#tree-count")).toHaveText("16"); // 2^4
    // 2^5 - 1 = 31 nodes in the full binary tree of depth 4
    await expect(page.locator("#tree-svg svg circle")).toHaveCount(31);
  });
});

test.describe("permutation generator", () => {
  test("n! count and chips", async ({ page }) => {
    await open(page);
    await setRange(page, "#perm-n", 5);
    await expect(page.locator("#perm-count")).toHaveText("120");
    await expect(page.locator("#perm-grid .seq-chip")).toHaveCount(120);
  });
});

test.describe("test-space calculator", () => {
  test("counts and four chart series", async ({ page }) => {
    await open(page);
    await setRange(page, "#m-k", 3);
    await setRange(page, "#m-n", 10);
    await expect(page.locator("#m-seq")).toHaveText("59,049"); // 3^10
    await expect(page.locator("#m-perm")).toHaveText("3,628,800"); // 10!
    await expect(page.locator("#m-chart svg polyline")).toHaveCount(4);
  });
});

test.describe("0–1 principle sorting network", () => {
  test("stepping and verify-all-16", async ({ page }) => {
    await open(page);
    await page.click("#net-step");
    await expect(page.locator("#net-out")).toContainText("step 1/5");
    await page.click("#net-all");
    await expect(page.locator("#net-out")).toContainText("binary inputs sort correctly");
  });

  test("0–1 principle holds in-browser for arbitrary values", async ({ page }) => {
    await open(page);
    const ok = await page.evaluate(() => {
      const { applyNetwork } = window.__sortguide;
      for (let t = 0; t < 8000; t++) {
        const v = [0, 1, 2, 3].map(() => (Math.random() * 10) | 0);
        const got = applyNetwork(v).join(",");
        const exp = v.slice().sort((a, b) => a - b).join(",");
        if (got !== exp) return false;
      }
      return true;
    });
    expect(ok).toBe(true);
  });
});

test.describe("live sort tester — the pass/fail matrix", () => {
  test("correct sort passes binary and permutations", async ({ page }) => {
    await open(page);
    expect(await runTester(page, "correct", "binary", 6)).toMatch(/PASS/);
    expect(await runTester(page, "correct", "perm", 6)).toMatch(/PASS/);
  });

  test("THE LESSON: dedup passes permutations but fails on repeats", async ({ page }) => {
    await open(page);

    // Permutations of distinct keys hide the dropped-duplicate bug.
    expect(await runTester(page, "dedup", "perm", 6)).toMatch(/PASS/);
    await expect(page.locator("#t-log")).toContainText("yet this sort is broken");

    // Finite-alphabet sequences expose it immediately.
    expect(await runTester(page, "dedup", "seq", 6)).toMatch(/FAIL/);
    await expect(page.locator("#t-flen")).not.toHaveText("—");
    await expect(page.locator("#t-counter svg").first()).toBeVisible();

    expect(await runTester(page, "dedup", "binary", 8)).toMatch(/FAIL/);
  });

  test("off-by-one and index bugs fail", async ({ page }) => {
    await open(page);
    expect(await runTester(page, "offbyone", "perm", 5)).toMatch(/FAIL/);
    expect(await runTester(page, "indices", "binary", 4)).toMatch(/FAIL/);
  });
});
