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
  /** external address 0 — the one attendees fund */
  address: string;
  balance: number; // sats across external 0 + change 0
  /** utxos annotated with their owning address + derivation path */
  utxos: any[];
}

export async function getWalletInfo(client: Awaited<ReturnType<typeof buildBrowserClient>>): Promise<WalletInfo> {
  // external 0 receives funding; payouts land on external 0-1 and change on
  // change 0-1 (the address provider walks indexes) — scan the first two of
  // each so back-to-back demos work without re-funding.
  const [ext, chg] = await Promise.all([
    client.wallet.getAddresses(0, 2, false),
    client.wallet.getAddresses(0, 2, true),
  ]);
  const utxos: any[] = [];
  for (const addr of [...ext, ...chg]) {
    const found = await esplora(`/address/${String(addr.address)}/utxo`);
    for (const u of found)
      utxos.push({ ...u, address: String(addr.address), derivationPath: addr.derivationPath });
  }
  const balance = utxos.reduce((s: number, u: any) => s + u.value, 0);
  return { address: String(ext[0].address), balance, utxos };
}

export async function getFundingInputs(info: WalletInfo): Promise<Input[]> {
  return Promise.all(
    info.utxos.map(async (utxo: any) => {
      const tx = await esplora(`/tx/${utxo.txid}`);
      return new Input(
        utxo.txid,
        utxo.vout,
        utxo.address,
        utxo.value / 1e8,
        utxo.value,
        utxo.derivationPath,
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
