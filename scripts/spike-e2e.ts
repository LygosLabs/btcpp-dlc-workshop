/**
 * End-to-end spike: full enum DLC flow on testnet4 using BAL 4.3.2 + DDK.
 *
 * Run: pnpm spike
 * First run generates mnemonics into .env and prints two funding addresses.
 * Fund them with testnet4 sats (>= 120k sats each), then re-run.
 *
 * Flow: announce -> offer -> accept -> sign -> finalize -> broadcast fund tx
 *       -> attest -> execute -> broadcast CET
 */
import fs from 'node:fs';
import path from 'node:path';

import { Input } from '@atomicfinance/types';
import * as ddk from '@bennyblader/ddk-ts';
import { generateMnemonic } from 'bip39';

import { buildClient, ESPLORA_API, EXPLORER } from '../lib/client';
import { BET_EVENT, betPayouts, buildEnumContractInfo } from '../lib/contracts';
import { WorkshopOracle } from '../lib/oracle';

const ENV_PATH = path.join(process.cwd(), '.env');

function loadEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
}

async function esplora(pathname: string): Promise<any> {
  const res = await fetch(`${ESPLORA_API}${pathname}`);
  if (!res.ok) throw new Error(`esplora ${pathname}: ${res.status} ${await res.text()}`);
  return res.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getFundingInput(client: ReturnType<typeof buildClient>, label: string): Promise<Input> {
  const addr = await client.wallet.getUnusedAddress();
  const address: string = addr.address;

  let utxos: any[] = await esplora(`/address/${address}/utxo`);
  if (utxos.length === 0) {
    console.log(`>>> FUND ${label}: ${address} (${EXPLORER}/address/${address})`);
    while (utxos.length === 0) {
      await sleep(10_000);
      utxos = await esplora(`/address/${address}/utxo`);
    }
    console.log(`    ${label} funded: ${utxos[0].txid}`);
  }

  const utxo = utxos[0];
  const tx = await esplora(`/tx/${utxo.txid}`);
  const scriptPubKey: string = tx.vout[utxo.vout].scriptpubkey;

  return new Input(
    utxo.txid,
    utxo.vout,
    address,
    utxo.value / 1e8,
    utxo.value,
    addr.derivationPath,
    108, // maxWitnessLength for p2wpkh
    '', // redeemScript
    undefined,
    scriptPubKey,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  );
}

async function main() {
  console.log('ddk version:', ddk.version());

  const env = loadEnv();
  if (!env.ALICE_MNEMONIC) {
    const lines = [
      `ALICE_MNEMONIC=${generateMnemonic(256)}`,
      `BOB_MNEMONIC=${generateMnemonic(256)}`,
    ];
    fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');
    Object.assign(env, loadEnv());
    console.log('Generated fresh mnemonics into .env (testnet only!)');
  }

  const alice = buildClient(env.ALICE_MNEMONIC, ddk);
  const bob = buildClient(env.BOB_MNEMONIC, ddk);

  console.log('Waiting for funding inputs (Alice + Bob)...');
  const [aliceInput, bobInput] = await Promise.all([
    getFundingInput(alice, 'ALICE'),
    getFundingInput(bob, 'BOB'),
  ]);
  console.log(`Alice input: ${aliceInput.txid}:${aliceInput.vout} (${aliceInput.amount} sats)`);
  console.log(`Bob input:   ${bobInput.txid}:${bobInput.vout} (${bobInput.amount} sats)`);

  // 1. Oracle announces the event
  const oracle = new WorkshopOracle();
  const maturity = Math.floor(Date.now() / 1000);
  const announcement = oracle.createAnnouncement(BET_EVENT.eventId, BET_EVENT.outcomes, maturity);
  console.log('\n[1] oracle announcement created:', announcement.oracleEvent.eventId);

  // 2. Alice creates the offer (even-money bet, 50k sats each side)
  const totalCollateral = 100_000n;
  const contractInfo = buildEnumContractInfo(announcement, betPayouts(totalCollateral), totalCollateral);
  const cetLocktime = maturity;
  const refundLocktime = maturity + 7 * 24 * 3600;

  const dlcOffer = await alice.dlc.createDlcOffer(
    contractInfo,
    totalCollateral / 2n, // Alice's collateral
    2n, // sats/vB
    cetLocktime,
    refundLocktime,
    [aliceInput],
  );
  console.log('[2] offer created:', dlcOffer.serialize().length, 'bytes');

  // 3. Bob accepts
  const { dlcAccept, dlcTransactions } = await bob.dlc.acceptDlcOffer(dlcOffer, [bobInput]);
  console.log('[3] accept created:', dlcAccept.serialize().length, 'bytes');

  // 4. Alice signs
  const { dlcSign } = await alice.dlc.signDlcAccept(dlcOffer, dlcAccept);
  console.log('[4] sign created:', dlcSign.serialize().length, 'bytes');

  // 5. Bob finalizes + broadcasts funding tx
  const fundTx = await bob.dlc.finalizeDlcSign(dlcOffer, dlcAccept, dlcSign, dlcTransactions);
  const fundTxId = await bob.chain.sendRawTransaction(fundTx.serialize().toString('hex'));
  console.log(`[5] funding tx broadcast: ${EXPLORER}/tx/${fundTxId}`);

  // 6. Oracle attests: Spain won
  const attestation = oracle.createAttestation(BET_EVENT.eventId, 'spain');
  console.log('[6] oracle attested: spain');

  // 7. Bob executes the CET
  const cet = await bob.dlc.execute(dlcOffer, dlcAccept, dlcSign, dlcTransactions, attestation, false);
  const cetTxId = await bob.chain.sendRawTransaction(cet.serialize().toString('hex'));
  console.log(`[7] CET broadcast: ${EXPLORER}/tx/${cetTxId}`);

  console.log('\nE2E SPIKE PASSED');
}

main().catch((err) => {
  console.error('SPIKE FAILED:', err);
  process.exit(1);
});
