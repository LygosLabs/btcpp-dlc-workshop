/**
 * Headless check of the oracle page: announce -> attest, then validate both
 * messages deserialize and the attestation verifies against the announcement.
 * Requires `pnpm start` (or dev) running on :3000 and Google Chrome installed.
 */
import { OracleAnnouncement, OracleAttestation } from '@node-dlc/messaging';
import { schnorr } from '@noble/curves/secp256k1';
import { math } from 'bip-schnorr';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));

  await page.goto(`${BASE}/oracle?demo=bet`, { waitUntil: 'networkidle0' });

  // Step 1: announce
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create announcement'),
    );
    btn?.click();
  });
  await page.waitForFunction(() => document.querySelectorAll('textarea[readonly]').length >= 1);
  const announcementHex = await page.evaluate(
    () => (document.querySelectorAll('textarea[readonly]')[0] as HTMLTextAreaElement).value,
  );

  // Step 2: attest (default outcome = spain)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Attest');
    btn?.click();
  });
  await page.waitForFunction(() => document.querySelectorAll('textarea[readonly]').length >= 2);
  const attestationHex = await page.evaluate(
    () => (document.querySelectorAll('textarea[readonly]')[1] as HTMLTextAreaElement).value,
  );
  await browser.close();

  // Validate in Node
  const ann = OracleAnnouncement.deserialize(Buffer.from(announcementHex, 'hex'));
  const att = OracleAttestation.deserialize(Buffer.from(attestationHex, 'hex'));

  if (ann.oracleEvent.eventId !== 'wc2026-final') throw new Error('bad eventId');
  if (att.outcomes[0] !== 'spain') throw new Error('bad outcome');

  // attestation must verify under the announced pubkey, with the committed nonce
  const msg = math.taggedHash('DLC/oracle/attestation/v0', Buffer.from('spain', 'utf8'));
  const sig = att.signatures[0];
  if (!schnorr.verify(sig, msg, ann.oraclePublicKey)) throw new Error('attestation sig invalid');
  const committedNonce = ann.oracleEvent.oracleNonces[0].toString('hex');
  if (sig.subarray(0, 32).toString('hex') !== committedNonce)
    throw new Error('attestation did not use the committed nonce');

  console.log('BROWSER ORACLE TEST PASSED');
  console.log('  announcement:', announcementHex.length / 2, 'bytes');
  console.log('  attestation: ', attestationHex.length / 2, 'bytes');
}

main().catch((e) => {
  console.error('BROWSER ORACLE TEST FAILED:', e);
  process.exit(1);
});
