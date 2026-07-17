/**
 * Build a BAL client for testnet4: JS wallet + esplora chain data + DDK for DLC ops.
 *
 * Note: testnet4 shares address prefixes (tb1) and coinType with testnet3,
 * so BitcoinNetworks.bitcoin_testnet works against a testnet4 esplora API.
 * (Same approach as the Lygos app.)
 */
import BitcoinDdkProvider from '@atomicfinance/bitcoin-ddk-provider';
import { BitcoinEsploraApiProvider } from '@atomicfinance/bitcoin-esplora-api-provider';
import { BitcoinJsWalletProvider } from '@atomicfinance/bitcoin-js-wallet-provider';
import { Client } from '@atomicfinance/client';
import Provider from '@atomicfinance/provider';
import { bitcoin } from '@atomicfinance/types';
import { BitcoinNetworks } from 'bitcoin-network';

/**
 * ponytail: single-address wallet. Address 0 for receive/payout, change 0 for
 * change — skips the ~50-request gap-limit scan getUnusedAddress normally does,
 * which matters with a room of attendees hitting mempool.space at once. Added
 * AFTER the wallet provider so it wins BAL's method resolution (instance
 * monkey-patching does not).
 */
class FixedAddressProvider extends Provider {
  private extIndex = 0;
  private chgIndex = 0;
  // Each call returns the next index (DDK requires payout != funding address),
  // starting from 0 so payouts land back on the address attendees can see.
  async getUnusedAddress(change = false) {
    const index = change ? this.chgIndex++ : this.extIndex++;
    return (await this.getMethod('getAddresses')(index, 1, change))[0];
  }
}

export const NETWORK = BitcoinNetworks.bitcoin_testnet;
export const ESPLORA_API = 'https://mempool.space/testnet4/api';
export const EXPLORER = 'https://mempool.space/testnet4';

// DdkInterface shape expected by BitcoinDdkProvider; the ddk-ts module satisfies it.
type DdkLib = ConstructorParameters<typeof BitcoinDdkProvider>[1];

export function buildClient(mnemonic: string, ddk: DdkLib): Client {
  const client = new Client();
  client.addProvider(
    new BitcoinEsploraApiProvider({
      url: ESPLORA_API,
      network: NETWORK,
    }),
  );
  client.addProvider(
    new BitcoinJsWalletProvider({
      network: NETWORK,
      mnemonic,
      baseDerivationPath: `m/84'/${NETWORK.coinType}'/0'`,
      addressType: bitcoin.AddressType.BECH32,
    }) as never,
  );
  client.addProvider(new FixedAddressProvider() as never);
  client.addProvider(new BitcoinDdkProvider(NETWORK, ddk));
  return client;
}
