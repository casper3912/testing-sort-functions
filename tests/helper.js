// Shared helpers for the Playwright specs.
const path = require("path");
const { pathToFileURL } = require("url");

// The page is a single self-contained file — load it straight off disk.
const PAGE_URL = pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;

// Open the page and start collecting any console/page errors. Return the array
// so a test can assert it stayed empty.
async function open(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console.error: " + m.text());
  });
  await page.goto(PAGE_URL);
  return errors;
}

// <input type="range"> isn't "fillable", so set its value and fire the input
// event the page listens for.
async function setRange(page, selector, value) {
  await page.$eval(
    selector,
    (el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value
  );
}

// Drive the live sort tester the way a user would, and return the result text.
async function runTester(page, impl, strategy, n) {
  await page.selectOption("#t-impl", impl);
  await page.click(`#t-strategy button[data-s="${strategy}"]`);
  await setRange(page, "#t-n", n);
  await page.click("#t-run");
  return (await page.textContent("#t-result")).trim();
}

module.exports = { PAGE_URL, open, setRange, runTester };
