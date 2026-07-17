/**
 * Replay the browser-created loan contract in Node (native ddk):
 * regenerate dlcSign + attestation, then execute. Distinguishes a wasm-only
 * bug from an app-flow bug.
 */
import fs from 'node:fs';

import * as ddk from '@bennyblader/ddk-ts';
import { DlcAccept, DlcOffer, DlcTransactions } from '@node-dlc/messaging';

import { buildClient, EXPLORER } from '../lib/client';
import { WorkshopOracle } from '../lib/oracle';

async function main() {
  const state = JSON.parse(fs.readFileSync('/tmp/loan-state.json', 'utf8'));
  const dlcOffer = DlcOffer.deserialize(Buffer.from(state['loan-offer-hex'], 'hex'));
  const dlcAccept = DlcAccept.deserialize(Buffer.from(state['loan-accept-hex'], 'hex'));
  const dlcTxs = DlcTransactions.deserialize(Buffer.from(state['loan-dlctxs-hex'], 'hex'));

  const alice = buildClient(state['mnemonic-offerer'], ddk as never);
  const bob = buildClient(state['mnemonic-accepter'], ddk as never);

  const { dlcSign } = await alice.dlc.signDlcAccept(dlcOffer, dlcAccept);
  console.log('sign regenerated');

  const oracleKeys = JSON.parse(state['oracle-keys']);
  const oracle = new WorkshopOracle(oracleKeys.priv, oracleKeys.nonces['loan-demo']);
  const attestation = oracle.createAttestation('loan-demo', 'not-funded');
  console.log('attestation regenerated');

  const cet = await bob.dlc.execute(dlcOffer, dlcAccept, dlcSign, dlcTxs, attestation, false);
  console.log('execute OK (native)');
  const txid = await bob.chain.sendRawTransaction(cet.serialize().toString('hex'));
  console.log(`CET broadcast: ${EXPLORER}/tx/${txid}`);
}

main().catch((e) => {
  console.error('REPLAY FAILED:', e);
  process.exit(1);
});
