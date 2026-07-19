// Accessibility tests — assert the WCAG-oriented affordances added after the
// UX research pass. These use plain Playwright (no extra dependencies). For a
// full automated WCAG scan you can add @axe-core/playwright (see TESTING.md).
const { test, expect } = require("@playwright/test");
const { open } = require("./helper");

test.describe("landmarks & skip link (WCAG 2.4.1)", () => {
  test("skip link is first focusable and targets main", async ({ page }) => {
    await open(page);
    const link = page.locator(".skip-link");
    await expect(link).toHaveAttribute("href", "#main");
    await page.keyboard.press("Tab"); // first Tab from the top of the document
    await expect(link).toBeFocused();
    await expect(page.locator("main#main")).toHaveAttribute("tabindex", "-1");
    await expect(page.locator("nav.toc")).toHaveAttribute("aria-label", /navigation/i);
  });
});

test.describe("toggle-button state (WCAG 4.1.2)", () => {
  test("language switcher reflects selection via aria-pressed", async ({ page }) => {
    await open(page);
    await expect(page.locator('.langbar button[data-lang="python"]')).toHaveAttribute("aria-pressed", "true");
    await page.click('.langbar button[data-lang="rust"]');
    await expect(page.locator('.langbar button[data-lang="rust"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.langbar button[data-lang="python"]')).toHaveAttribute("aria-pressed", "false");
  });

  test("tester strategy segmented control uses aria-pressed", async ({ page }) => {
    await open(page);
    await expect(page.locator('#t-strategy button[data-s="binary"]')).toHaveAttribute("aria-pressed", "true");
    await page.click('#t-strategy button[data-s="perm"]');
    await expect(page.locator('#t-strategy button[data-s="perm"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#t-strategy button[data-s="binary"]')).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("form controls have accessible names (WCAG 1.3.1 / 4.1.2)", () => {
  test("sliders and selects are labelled", async ({ page }) => {
    await open(page);
    await expect(page.locator("#tree-k")).toHaveAttribute("aria-label", /alphabet size/i);
    await expect(page.locator("#tree-n")).toHaveAttribute("aria-label", /length/i);
    await expect(page.locator("#m-budget")).toHaveAttribute("aria-label", /budget/i);
    await expect(page.locator("#t-impl")).toHaveAttribute("aria-label", /implementation/i);
  });
});

test.describe("live regions & non-text chart alt (WCAG 4.1.3 / 1.1.1)", () => {
  test("dynamic outputs announce politely and the chart has a text alternative", async ({ page }) => {
    await open(page);
    await expect(page.locator("#t-log")).toHaveAttribute("aria-live", "polite");
    await expect(page.locator("#net-out")).toHaveAttribute("aria-live", "polite");
    await expect(page.locator("#m-chart svg")).toHaveAttribute("role", "img");
    await expect(page.locator("#m-chart svg")).toHaveAttribute("aria-label", /.+/);
  });
});

test.describe("keyboard operability (WCAG 2.1.1)", () => {
  test("sorting-network inputs are operable by keyboard", async ({ page }) => {
    await open(page);
    const chip = page.locator("#net-inputs .chip-btn").first();
    await expect(chip).toHaveAttribute("role", "button");
    await expect(chip).toHaveAttribute("tabindex", "0");
    const before = (await chip.textContent()).trim();
    await chip.focus();
    await page.keyboard.press("Enter"); // toggle the bit with the keyboard
    const after = (await page.locator("#net-inputs .chip-btn").first().textContent()).trim();
    expect(after).not.toBe(before);
  });
});
