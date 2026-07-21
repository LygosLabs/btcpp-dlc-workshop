/**
 * Full DLC lifecycle with serialize/deserialize round-trips between every
 * step — offer → accept → sign → finalize → attest → execute — but nothing
 * is ever broadcast, so it costs zero sats.
 *
 * This exercises the exact path that failed with InvalidSignature before
 * bitcoin-abstraction-layer 4.3.5 (split adaptor sigs after deserialize),
 * proving the unpatched upstream release works with this stack.
 *
 * Run: pnpm exec tsx scripts/e2e-nobroadcast.ts
 */
import fs from 'node:fs';
import path from 'node:path';

import * as ddk from '@bennyblader/ddk-ts';
import {
  DlcAccept,
  DlcOffer,
  DlcSign,
  DlcTransactions,
  OracleAttestation,
} from '@node-dlc/messaging';

import { buildClient } from '../lib/client';
import { BET_EVENT, betPayouts, buildEnumContractInfo } from '../lib/contracts';
import { WorkshopOracle } from '../lib/oracle';
import { getFundingInputs, getWalletInfo } from '../lib/wallet';

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

// Round-trip helper: every message crosses "the wire" as hex, like real peers.
const rt = <T>(msg: { serialize(): Buffer }, cls: { deserialize(buf: Buffer): T }): T =>
  cls.deserialize(Buffer.from(msg.serialize().toString('hex'), 'hex'));

async function main() {
  console.log('BAL execute path check on', ddk.version(), '(no broadcast)');
  const env = loadEnv();
  const alice = buildClient(env.ALICE_MNEMONIC, ddk);
  const bob = buildClient(env.BOB_MNEMONIC, ddk);

  const [aliceInfo, bobInfo] = await Promise.all([
    getWalletInfo(alice as never),
    getWalletInfo(bob as never),
  ]);
  const [aliceInputs, bobInputs] = await Promise.all([
    getFundingInputs(aliceInfo),
    getFundingInputs(bobInfo),
  ]);

  const oracle = new WorkshopOracle();
  const maturity = Math.floor(Date.now() / 1000);
  const announcement = oracle.createAnnouncement(BET_EVENT.eventId, BET_EVENT.outcomes, maturity);

  const totalCollateral = 92_000n;
  const contractInfo = buildEnumContractInfo(announcement, betPayouts(totalCollateral), totalCollateral);
  const offer = rt(
    await alice.dlc.createDlcOffer(contractInfo, 90_000n, 1n, maturity, maturity + 7 * 24 * 3600, aliceInputs),
    DlcOffer,
  );
  console.log('[1] offer ok');

  const acceptRes = await bob.dlc.acceptDlcOffer(offer, bobInputs);
  const accept = rt(acceptRes.dlcAccept, DlcAccept);
  const dlcTxs = rt(acceptRes.dlcTransactions, DlcTransactions);
  console.log('[2] accept ok');

  const sign = rt((await alice.dlc.signDlcAccept(offer, accept)).dlcSign, DlcSign);
  console.log('[3] sign ok');

  const fundTx = await bob.dlc.finalizeDlcSign(offer, accept, sign, dlcTxs);
  console.log('[4] finalize ok (fund tx assembled, NOT broadcast):', fundTx.txId.toString());

  const attestation = rt(oracle.createAttestation(BET_EVENT.eventId, 'spain'), OracleAttestation);
  const cet = await bob.dlc.execute(offer, accept, sign, dlcTxs, attestation, false);
  console.log('[5] execute ok (CET signed, NOT broadcast):', cet.txId.toString());

  console.log('\nNO-BROADCAST E2E PASSED — 4.3.5 execute path verified');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
