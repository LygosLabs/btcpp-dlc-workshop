/**
 * Smoke check: the home page loads the wasm DLC engine in headless Chrome.
 * Usage: pnpm exec tsx scripts/browser-load-check.ts  (BASE_URL to point elsewhere)
 */
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('DLC engine loaded') ||
      document.body.innerText.includes('failed to load'),
    { timeout: 60000 },
  );
  const line = await page.evaluate(() =>
    [...document.querySelectorAll('p')].map((p) => p.innerText).find((t) => t.includes('DLC engine')),
  );
  console.log('RESULT:', line);
  await browser.close();
  process.exit(line?.includes('loaded') ? 0 : 1);
}

main();
