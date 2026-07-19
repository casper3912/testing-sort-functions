// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Playwright config for index.html.
 *
 * Only *.spec.js files are Playwright tests; tests/engine.test.mjs is a
 * separate Node test suite (run with `npm test`) and is deliberately excluded
 * via testMatch.
 */
module.exports = defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",

  // Tolerate sub-pixel anti-aliasing differences in the visual-regression baselines.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },

  use: {
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Enable after `npx playwright install firefox webkit`:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit",  use: { ...devices["Desktop Safari"] } },
  ],
});
