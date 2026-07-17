/** Replay execute in the browser with instrumented signCet (no funds consumed). */
import fs from 'node:fs';

import puppeteer from 'puppeteer-core';

const state = JSON.parse(fs.readFileSync('/tmp/loan-state.json', 'utf8'));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const page = await browser.newPage();
  page.on('console', (m) => {
    if (m.text().includes('SIGCET')) console.log(m.text().slice(0, 600));
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await page.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, String(v));
  }, state);
  await page.goto('http://localhost:3000/accepter?demo=loan', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !!(globalThis as never as { __ddk?: unknown }).__ddk, {
    timeout: 60_000,
  });
  await page.evaluate(() => {
    const g = globalThis as never as { __ddk: Record<string, (...a: unknown[]) => unknown> };
    const orig = g.__ddk.signCet;
    g.__ddk.signCet = (...args) => {
      const [cet, adaptorSig, oracleSigs, fundSk, localPk, remotePk, fundVal] = args as [
        { rawBytes?: Uint8Array },
        Uint8Array,
        Uint8Array[],
        Uint8Array,
        Uint8Array,
        Uint8Array,
        unknown,
      ];
      console.log(
        'SIGCET args:',
        JSON.stringify({
          cetRawLen: cet?.rawBytes?.length,
          cetRawType: cet?.rawBytes?.constructor?.name,
          adaptorLen: adaptorSig?.length,
          adaptorType: adaptorSig?.constructor?.name,
          oracleSigs: Array.isArray(oracleSigs)
            ? oracleSigs.map((s) => ({
                len: s?.length,
                type: s?.constructor?.name,
                off: (s as Uint8Array)?.byteOffset,
              }))
            : typeof oracleSigs,
          fundSkLen: fundSk?.length,
          localPkLen: localPk?.length,
          remotePkLen: remotePk?.length,
          fundVal: String(fundVal),
          fundValType: typeof fundVal,
        }),
      );
      try {
        const r = orig(...args);
        console.log('SIGCET ok');
        return r;
      } catch (e) {
        console.log('SIGCET threw:', String(e));
        throw e;
      }
    };
  });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Execute DLC')
      ?.click();
  });
  await new Promise((r) => setTimeout(r, 15_000));
  console.log(
    'error box:',
    await page.evaluate(() => document.querySelector('pre')?.textContent ?? '(none)'),
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
