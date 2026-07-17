/** Debug helper: print the first few external/change addresses for the .env wallets. */
import fs from 'node:fs';

import { BitcoinEsploraApiProvider } from '@atomicfinance/bitcoin-esplora-api-provider';
import { BitcoinJsWalletProvider } from '@atomicfinance/bitcoin-js-wallet-provider';
import { Client } from '@atomicfinance/client';
import { bitcoin } from '@atomicfinance/types';
import { BitcoinNetworks } from 'bitcoin-network';

async function main() {
  const env = Object.fromEntries(
    fs
      .readFileSync('.env', 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
  const network = BitcoinNetworks.bitcoin_testnet;
  for (const [name, mnemonic] of [
    ['alice', env.ALICE_MNEMONIC],
    ['bob', env.BOB_MNEMONIC],
  ]) {
    const c = new Client();
    c.addProvider(
      new BitcoinEsploraApiProvider({ url: 'https://mempool.space/testnet4/api', network }),
    );
    c.addProvider(
      new BitcoinJsWalletProvider({
        network,
        mnemonic,
        baseDerivationPath: "m/84'/1'/0'",
        addressType: bitcoin.AddressType.BECH32,
      }) as never,
    );
    const ext = (await c.wallet.getAddresses(0, 3, false)).map((a) => String(a.address));
    const chg = (await c.wallet.getAddresses(0, 3, true)).map((a) => String(a.address));
    console.log(name, 'external:', ext.join(' '));
    console.log(name, 'change:  ', chg.join(' '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
