/**
 * Browser-side wallet helpers. Each role (offerer/accepter) gets its own
 * mnemonic stored in localStorage — testnet only, clearly not for real funds.
 */
import { Input } from '@atomicfinance/types';
import { generateMnemonic } from 'bip39';

import { buildClient, ESPLORA_API } from './client';
import { getDdk } from './ddk-browser';

export type Role = 'offerer' | 'accepter';

export function getOrCreateMnemonic(role: Role): string {
  const key = `mnemonic-${role}`;
  let mnemonic = localStorage.getItem(key);
  if (!mnemonic) {
    mnemonic = generateMnemonic(256);
    localStorage.setItem(key, mnemonic);
  }
  return mnemonic;
}

export async function buildBrowserClient(role: Role) {
  const ddk = await getDdk();
  return buildClient(getOrCreateMnemonic(role), ddk as never);
}

export async function esplora(path: string): Promise<any> {
  const res = await fetch(`${ESPLORA_API}${path}`);
  if (!res.ok) throw new Error(`esplora ${path}: ${res.status}`);
  return res.json();
}

export interface WalletInfo {
  address: string;
  derivationPath: string;
  balance: number; // sats on address 0
  utxos: any[];
}

export async function getWalletInfo(client: Awaited<ReturnType<typeof buildBrowserClient>>): Promise<WalletInfo> {
  const addr = (await client.wallet.getAddresses(0, 1, false))[0];
  const address = String(addr.address);
  const utxos = await esplora(`/address/${address}/utxo`);
  const balance = utxos.reduce((s: number, u: any) => s + u.value, 0);
  return { address, derivationPath: addr.derivationPath ?? '', balance, utxos };
}

export async function getFundingInputs(info: WalletInfo): Promise<Input[]> {
  return Promise.all(
    info.utxos.map(async (utxo: any) => {
      const tx = await esplora(`/tx/${utxo.txid}`);
      return new Input(
        utxo.txid,
        utxo.vout,
        info.address,
        utxo.value / 1e8,
        utxo.value,
        info.derivationPath,
        108, // maxWitnessLength for p2wpkh
        '',
        undefined,
        tx.vout[utxo.vout].scriptpubkey,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    }),
  );
}
