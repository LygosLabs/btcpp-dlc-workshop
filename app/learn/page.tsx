import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How DLCs work — btc++ DLC Workshop',
  description:
    'The anatomy of a Discreet Log Contract, how to parse DLC messages with @node-dlc, and how to run this workshop yourself.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm overflow-x-auto">
      {children}
    </pre>
  );
}

export default function Learn() {
  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">How DLCs actually work</h1>
        <p className="text-zinc-400">
          What the hex you&apos;re pasting between tabs really is, how to work with it in your own
          code, and how to run this whole app yourself.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">The protocol in one picture</h2>
        <p className="text-zinc-400">
          From the official{' '}
          <a
            href="https://github.com/discreetlogcontracts/dlcspecs"
            className="text-orange-400 hover:underline"
          >
            dlcspecs
          </a>{' '}
          — the specification every DLC implementation follows:
        </p>
        <div className="bg-white rounded-lg p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dlc_overview.png" alt="DLC protocol overview (dlcspecs)" className="w-full" />
        </div>
        <ul className="text-zinc-400 space-y-2 list-disc list-inside">
          <li>
            <span className="text-zinc-200">Announcement</span> — the oracle commits to an event
            and a one-time nonce, before anyone builds a contract on it.
          </li>
          <li>
            <span className="text-zinc-200">Offer → Accept → Sign</span> — the two parties
            negotiate entirely off-chain. The accept and sign messages carry{' '}
            <em>adaptor signatures</em>: one encrypted signature per possible outcome.
          </li>
          <li>
            <span className="text-zinc-200">Funding transaction</span> — the only on-chain
            footprint at setup: a plain-looking 2-of-2 multisig output.
          </li>
          <li>
            <span className="text-zinc-200">Attestation</span> — the oracle signs the actual
            outcome with its committed nonce. This signature is the decryption key.
          </li>
          <li>
            <span className="text-zinc-200">CET (Contract Execution Transaction)</span> — the one
            pre-signed settlement transaction the attestation unlocks. All the others can never be
            completed.
          </li>
          <li>
            <span className="text-zinc-200">Refund</span> — a timelocked escape hatch signed at
            setup, in case the oracle never attests.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">The hex is a real wire format</h2>
        <p className="text-zinc-400">
          Every blob you copy between tabs is a standard DLC message. You can parse any of them
          with{' '}
          <a
            href="https://github.com/AtomicFinance/node-dlc"
            className="text-orange-400 hover:underline"
          >
            @node-dlc/messaging
          </a>{' '}
          — try it on hex straight out of this app:
        </p>
        <Code>{`import {
  DlcOffer,
  DlcAccept,
  DlcSign,
  OracleAnnouncement,
  OracleAttestation,
} from '@node-dlc/messaging';

// Paste any offer hex from the Offerer tab:
const offer = DlcOffer.deserialize(Buffer.from(offerHex, 'hex'));
console.log(offer.contractInfo.totalCollateral); // 100000n
console.log(offer.offerCollateral);              // the offerer's share
console.log(offer.fundingInputs.length);         // UTXOs backing it

// Serialization round-trips byte-for-byte — it's the wire format:
offer.serialize().toString('hex') === offerHex;  // true

// Same for the rest of the conversation:
const accept = DlcAccept.deserialize(Buffer.from(acceptHex, 'hex'));
console.log(accept.cetAdaptorSignatures.sigs.length); // one per outcome

const ann = OracleAnnouncement.deserialize(Buffer.from(announcementHex, 'hex'));
console.log(ann.oracleEvent.eventId);            // 'wc2026-final'`}</Code>
        <p className="text-zinc-400">
          Because it&apos;s a standardized format, your counterparty can run entirely different
          software — a Rust daemon built on{' '}
          <a href="https://github.com/bennyhodl/dlcdevkit" className="text-orange-400 hover:underline">
            dlcdevkit
          </a>
          , for example — and the messages still interoperate.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Building the client stack</h2>
        <p className="text-zinc-400">
          This app drives the whole lifecycle with{' '}
          <a
            href="https://github.com/AtomicFinance/bitcoin-abstraction-layer"
            className="text-orange-400 hover:underline"
          >
            bitcoin-abstraction-layer
          </a>{' '}
          (BAL): a wallet provider, a chain-data provider, and <code>BitcoinDdkProvider</code> —
          the DLC engine (Rust, compiled to wasm so it runs right here in your browser). This is
          the exact setup from <code>lib/client.ts</code>:
        </p>
        <Code>{`import BitcoinDdkProvider from '@atomicfinance/bitcoin-ddk-provider';
import { BitcoinEsploraApiProvider } from '@atomicfinance/bitcoin-esplora-api-provider';
import { BitcoinJsWalletProvider } from '@atomicfinance/bitcoin-js-wallet-provider';
import { Client } from '@atomicfinance/client';
import * as ddk from '@bennyblader/ddk-ts';

const client = new Client();
client.addProvider(new BitcoinEsploraApiProvider({
  url: 'https://mempool.space/testnet4/api',
  network,
}));
client.addProvider(new BitcoinJsWalletProvider({
  network,
  mnemonic,
  baseDerivationPath: "m/84'/1'/0'",
  addressType: 'bech32',
}));
client.addProvider(new BitcoinDdkProvider(network, ddk));

// Then the whole lifecycle is five calls:
const offer = await client.dlc.createDlcOffer(contractInfo, collateral, feeRate,
  cetLocktime, refundLocktime, inputs);
const { dlcAccept, dlcTransactions } = await client.dlc.acceptDlcOffer(offer, inputs);
const { dlcSign } = await client.dlc.signDlcAccept(offer, dlcAccept);
const fundTx = await client.dlc.finalizeDlcSign(offer, dlcAccept, dlcSign, dlcTransactions);
const cet = await client.dlc.execute(offer, dlcAccept, dlcSign, dlcTransactions,
  attestation, isOfferer);`}</Code>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Run this yourself</h2>
        <p className="text-zinc-400">
          The whole workshop is open source. Clone it and you have the identical app locally:
        </p>
        <Code>{`git clone https://github.com/LygosLabs/btcpp-dlc-workshop
cd btcpp-dlc-workshop
pnpm install
pnpm dev          # http://localhost:3000`}</Code>
        <p className="text-zinc-400">
          There&apos;s also a Node end-to-end script that runs the full lifecycle on testnet4
          without a browser — the best starting point for building your own integration:
        </p>
        <Code>{`# needs ALICE_MNEMONIC / BOB_MNEMONIC in .env with funded testnet4 wallets
pnpm exec tsx scripts/spike-e2e.ts`}</Code>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Keep going</h2>
        <ul className="text-zinc-400 space-y-2 list-disc list-inside">
          <li>
            <a
              href="https://github.com/LygosLabs/btcpp-dlc-workshop/blob/master/docs/FAQ.md"
              className="text-orange-400 hover:underline"
            >
              Developer FAQ
            </a>{' '}
            — the sharp edges we hit building this (and how to avoid them)
          </li>
          <li>
            <a
              href="https://github.com/discreetlogcontracts/dlcspecs/blob/master/Introduction.md"
              className="text-orange-400 hover:underline"
            >
              dlcspecs Introduction
            </a>{' '}
            — the canonical spec
          </li>
          <li>
            <a
              href="https://mblack.io/posts/dlc-are-perfect-for-lending/"
              className="text-orange-400 hover:underline"
            >
              DLCs are perfect for Lending
            </a>{' '}
            — why 4 enumerated outcomes beat 1000-point payout curves
          </li>
          <li>
            <a
              href="https://github.com/bennyhodl/dlcdevkit"
              className="text-orange-400 hover:underline"
            >
              dlcdevkit
            </a>{' '}
            — the Rust path (this app runs its bindings as wasm)
          </li>
        </ul>
      </section>
    </div>
  );
}
