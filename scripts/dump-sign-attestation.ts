/** Regenerate sign + attestation for the saved loan state and add them to the JSON. */
import fs from 'node:fs';

import * as ddk from '@bennyblader/ddk-ts';
import { DlcAccept, DlcOffer } from '@node-dlc/messaging';

import { buildClient } from '../lib/client';
import { WorkshopOracle } from '../lib/oracle';

async function main() {
  const state = JSON.parse(fs.readFileSync('/tmp/loan-state.json', 'utf8'));
  const dlcOffer = DlcOffer.deserialize(Buffer.from(state['loan-offer-hex'], 'hex'));
  const dlcAccept = DlcAccept.deserialize(Buffer.from(state['loan-accept-hex'], 'hex'));
  const alice = buildClient(state['mnemonic-offerer'], ddk as never);
  const { dlcSign } = await alice.dlc.signDlcAccept(dlcOffer, dlcAccept);
  const oracleKeys = JSON.parse(state['oracle-keys']);
  const oracle = new WorkshopOracle(oracleKeys.priv, oracleKeys.nonces['loan-demo']);
  state['loan-sign-hex'] = dlcSign.serialize().toString('hex');
  state['loan-attestation-hex'] = oracle
    .createAttestation('loan-demo', 'not-funded')
    .serialize()
    .toString('hex');
  fs.writeFileSync('/tmp/loan-state.json', JSON.stringify(state, null, 2));
  console.log('state completed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
