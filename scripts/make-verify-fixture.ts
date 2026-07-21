/**
 * Generate real offer/accept hex (nothing broadcast) and run it through the
 * live dlc-verify API — proves workshop hex verifies on lygos-dlc-verify.
 *
 * Run: pnpm exec tsx scripts/make-verify-fixture.ts
 * Needs funded ALICE_MNEMONIC / BOB_MNEMONIC in .env (no sats are spent).
 */
import fs from 'node:fs';
import path from 'node:path';

import * as ddk from '@bennyblader/ddk-ts';

import { buildClient } from '../lib/client';
import { BET_EVENT, betPayouts, buildEnumContractInfo } from '../lib/contracts';
import { WorkshopOracle } from '../lib/oracle';
import { getFundingInputs, getWalletInfo } from '../lib/wallet';

const VERIFY_API = process.env.VERIFY_API ?? 'https://lygos-dlc-verify.vercel.app/api/verify';

function loadEnv(): Record<string, string> {
  const p = path.join(process.cwd(), '.env');
  return Object.fromEntries(
    fs
      .readFileSync(p, 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
}

async function main() {
  const env = loadEnv();
  const alice = buildClient(env.ALICE_MNEMONIC, ddk);
  const bob = buildClient(env.BOB_MNEMONIC, ddk);

  const [aliceInfo, bobInfo] = await Promise.all([getWalletInfo(alice as never), getWalletInfo(bob as never)]);
  console.log(`alice balance: ${aliceInfo.balance} sats, bob balance: ${bobInfo.balance} sats`);
  const [aliceInputs, bobInputs] = await Promise.all([
    getFundingInputs(aliceInfo),
    getFundingInputs(bobInfo),
  ]);

  const oracle = new WorkshopOracle();
  const maturity = Math.floor(Date.now() / 1000);
  const announcement = oracle.createAnnouncement(BET_EVENT.eventId, BET_EVENT.outcomes, maturity);
  const oraclePubkey = announcement.oraclePublicKey.toString('hex');

  // Asymmetric split so Bob's small change UTXO suffices; nothing broadcasts.
  const totalCollateral = 92_000n;
  const contractInfo = buildEnumContractInfo(announcement, betPayouts(totalCollateral), totalCollateral);
  const dlcOffer = await alice.dlc.createDlcOffer(
    contractInfo,
    90_000n,
    1n,
    maturity,
    maturity + 7 * 24 * 3600,
    aliceInputs,
  );
  const { dlcAccept } = await bob.dlc.acceptDlcOffer(dlcOffer, bobInputs);

  const offer = dlcOffer.serialize().toString('hex');
  const accept = dlcAccept.serialize().toString('hex');
  console.log(`offer: ${offer.length / 2} bytes (${offer.slice(0, 8)}…), accept: ${accept.length / 2} bytes (${accept.slice(0, 8)}…)`);

  const res = await fetch(VERIFY_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ offer, accept, expectedOraclePubkey: oraclePubkey }),
  });
  const result: any = await res.json();

  console.log('\ndlc-verify result:');
  for (const k of [
    'error',
    'contractType',
    'totalCollateral',
    'oracleSigValid',
    'oraclePubkeyMatchesExpected',
    'adaptorSigVerificationAvailable',
    'adaptorValid',
    'adaptorValidCount',
    'adaptorTotalCount',
    'fundingAddress',
  ])
    console.log(`  ${k}:`, result[k]);
  console.log('  outcomes:', JSON.stringify(result.outcomes ?? result.payouts ?? null));

  const pass = !result.error && result.oracleSigValid && result.adaptorValid;
  console.log(pass ? '\nVERIFY FIXTURE PASSED' : '\nVERIFY FIXTURE FAILED');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
