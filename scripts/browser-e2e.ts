/**
 * Full demo flow driven through the real UI in headless Chrome,
 * using the funded .env wallets (alice=offerer, bob=accepter).
 * Requires a server on BASE_URL (default localhost:3000) and Chrome.
 * DEMO=bet (default) or DEMO=loan selects the demo.
 */
import fs from 'node:fs';

import puppeteer, { Page } from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const DEMO = process.env.DEMO === 'loan' ? 'loan' : 'bet';
// visible balance needed before clicking offer/accept
const NEED = DEMO === 'loan' ? { offerer: 105_000, accepter: 15_000 } : { offerer: 55_000, accepter: 55_000 };

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

async function click(page: Page, text: string) {
  await page.evaluate((t: string) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === t);
    if (!btn) throw new Error(`button not found: ${t}`);
    if (btn.disabled) throw new Error(`button disabled: ${t}`);
    btn.click();
  }, text);
}

async function waitForKey(page: Page, key: string, timeout = 120_000): Promise<string> {
  await page.waitForFunction(
    (k: string) => !!localStorage.getItem(k) || !!document.querySelector('pre')?.textContent,
    { timeout },
    key,
  );
  const err = await page.evaluate(() => document.querySelector('pre')?.textContent ?? null);
  if (err) throw new Error(`page error box: ${err}`);
  return page.evaluate((k: string) => localStorage.getItem(k)!, key);
}

function waitForBalance(page: Page, min: number) {
  return page.waitForFunction(
    (m: number) => {
      const match = document.body.textContent?.match(/([\d,]+)\s*sats/);
      return !!match && parseInt(match[1].replace(/,/g, '')) >= m;
    },
    { timeout: 60_000 },
    min,
  );
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: `/tmp/wk-e2e-profile-${DEMO}`,
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) console.error('CONSOLE:', m.text().slice(0, 300));
  });

  // seed wallets, clear any stale state for this demo
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(
    (alice: string, bob: string, demo: string) => {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(`${demo}-`) || k === 'oracle-keys') localStorage.removeItem(k);
      }
      localStorage.setItem('mnemonic-offerer', alice);
      localStorage.setItem('mnemonic-accepter', bob);
    },
    env.ALICE_MNEMONIC,
    env.BOB_MNEMONIC,
    DEMO,
  );

  const goto = (path: string) => page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });

  // 1. oracle announces
  await goto(`/oracle?demo=${DEMO}`);
  await click(page, 'Create announcement');
  await waitForKey(page, `${DEMO}-announcement-hex`);
  console.log('[1] announcement created');

  // 2. offerer creates offer (announcement auto-loads from shared localStorage)
  await goto(`/offerer?demo=${DEMO}`);
  await waitForBalance(page, NEED.offerer);
  await click(page, 'Create offer');
  await waitForKey(page, `${DEMO}-offer-hex`);
  console.log('[2] offer created');

  // 3. accepter accepts
  await goto(`/accepter?demo=${DEMO}`);
  await waitForBalance(page, NEED.accepter);
  await click(page, 'Accept offer');
  await waitForKey(page, `${DEMO}-accept-hex`);
  console.log('[3] accept created');

  // 4. offerer signs
  await goto(`/offerer?demo=${DEMO}`);
  await waitForBalance(page, 1);
  await click(page, 'Sign accept');
  await waitForKey(page, `${DEMO}-sign-hex`);
  console.log('[4] sign created');

  // 5. accepter finalizes + broadcasts
  await goto(`/accepter?demo=${DEMO}`);
  await waitForBalance(page, 1);
  await click(page, 'Finalize + broadcast');
  const fundTxId = await waitForKey(page, `${DEMO}-fund-txid`);
  console.log(`[5] funding tx: https://mempool.space/testnet4/tx/${fundTxId}`);

  // 6. oracle attests (default = first outcome)
  await goto(`/oracle?demo=${DEMO}`);
  await click(page, 'Attest');
  await waitForKey(page, `${DEMO}-attestation-hex`);
  console.log('[6] attested (first outcome)');

  // 7. accepter executes
  await goto(`/accepter?demo=${DEMO}`);
  await waitForBalance(page, 1);
  await click(page, 'Execute DLC');
  const cetTxId = await waitForKey(page, `${DEMO}-cet-txid`);
  console.log(`[7] CET: https://mempool.space/testnet4/tx/${cetTxId}`);

  await browser.close();
  console.log(`BROWSER E2E PASSED (${DEMO})`);
}

main().catch((e) => {
  console.error('BROWSER E2E FAILED:', e);
  process.exit(1);
});
