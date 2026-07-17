'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getDdk } from '../lib/ddk-browser';

export default function Home() {
  const [ddkVersion, setDdkVersion] = useState<string | null>(null);
  const [ddkError, setDdkError] = useState<string | null>(null);

  useEffect(() => {
    getDdk()
      .then((ddk) => setDdkVersion(ddk.version()))
      .catch((e) => setDdkError(String(e)));
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">
          Building Bitcoin-Native Applications with Discreet Log Contracts
        </h1>
        <p className="text-zinc-400">
          btc++ Toronto 2026 · Lygos Finance · everything below runs in your browser on testnet4
        </p>
        <p className="text-sm">
          {ddkVersion ? (
            <span className="text-green-400">✓ DLC engine loaded (ddk {ddkVersion}, wasm)</span>
          ) : ddkError ? (
            <span className="text-red-400">DLC engine failed to load: {ddkError}</span>
          ) : (
            <span className="text-zinc-500">loading DLC engine (wasm)…</span>
          )}
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <Link
          href="/oracle?demo=bet"
          className="block border border-zinc-800 rounded-lg p-6 hover:border-orange-400"
        >
          <h2 className="text-xl font-semibold mb-2">⚽ Demo 1 — Bet on the World Cup Final</h2>
          <p className="text-zinc-400 text-sm">
            Spain vs Argentina. An even-money winner-takes-all bet settled by an oracle
            attestation. Three browser tabs: oracle, offerer (backs Spain), accepter (backs
            Argentina).
          </p>
        </Link>
        <Link
          href="/oracle?demo=loan"
          className="block border border-zinc-800 rounded-lg p-6 hover:border-orange-400"
        >
          <h2 className="text-xl font-semibold mb-2">🏦 Demo 2 — A Bitcoin-Collateralized Loan</h2>
          <p className="text-zinc-400 text-sm">
            The Lygos model: four enumerated outcomes (not-funded, repaid, liquidated-by-price,
            liquidated-by-maturity). Borrower posts BTC collateral; the oracle attests to what
            happened to the loan.
          </p>
        </Link>
      </section>

      <section className="text-sm text-zinc-400 space-y-2">
        <h3 className="text-zinc-200 font-semibold">How the workshop flows</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open the Oracle, Offerer, and Accepter pages in three tabs.</li>
          <li>Generate wallets (stored locally in your browser) and fund them with testnet4 sats.</li>
          <li>Oracle announces the event → Offerer creates a DLC offer → Accepter accepts.</li>
          <li>Offerer signs → Accepter finalizes and broadcasts the funding transaction.</li>
          <li>Oracle attests to the outcome → Accepter executes the winning transaction.</li>
        </ol>
        <p>
          Messages travel between tabs as hex — copy and paste them just like real DLC peers
          exchanging messages over the wire.
        </p>
      </section>
    </div>
  );
}
