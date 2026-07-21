'use client';

import { useEffect, useState } from 'react';

/**
 * Intro slide deck for the workshop's first 10 minutes. Present this full-screen,
 * then switch to the app URL (last slide) for the live demos.
 *
 * Keys: → / space next · ← previous · N toggle presenter notes.
 */

type Slide = { title: string; body: React.ReactNode; notes: string[] };

const APP_URL = 'btcpp-dlc-workshop.vercel.app';

const code = (s: string) => (
  <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left text-sm md:text-base overflow-x-auto">
    {s}
  </pre>
);

const SLIDES: Slide[] = [
  {
    title: 'Building Bitcoin-Native Applications with Discreet Log Contracts',
    body: (
      <div className="space-y-4 text-zinc-400">
        <p className="text-2xl">btc++ Toronto 2026</p>
        <p>
          <span className="text-orange-400">Lygos Finance</span> · everything today runs in your
          browser, on testnet4, with real transactions
        </p>
      </div>
    ),
    notes: [
      'Welcome everyone. Today you will build and settle real Bitcoin smart contracts — in your browser, no installs.',
      'By the end you will have placed an oracle-settled bet and closed a Bitcoin-collateralized loan, both on testnet4, both visible on a block explorer.',
      'Quick ~10 minutes of theory first so the demo makes sense, then we go hands-on.',
    ],
  },
  {
    title: 'The problem',
    body: (
      <ul className="space-y-4 text-2xl">
        <li>
          Bitcoin script can&apos;t say <em className="text-orange-400">&ldquo;pay whoever won the World Cup&rdquo;</em>
        </li>
        <li>It doesn&apos;t know anything about the outside world</li>
        <li className="text-zinc-400">
          Naive fix: give a middleman your money and trust them. Custody, counterparty risk, exit
          scams.
        </li>
      </ul>
    ),
    notes: [
      'Bitcoin script is deliberately tiny. It can check signatures and timelocks — it cannot know who won a football match or what the BTC price is.',
      'Any contract about the real world needs someone to bring the truth on-chain.',
      'The naive way is a trusted escrow that holds your money. The DLC way: nobody ever holds your money. That is the whole point of the next few slides.',
    ],
  },
  {
    title: 'What a DLC is',
    body: (
      <ol className="space-y-4 text-2xl list-decimal list-inside">
        <li>
          Two parties lock funds in a plain <span className="text-orange-400">2-of-2 multisig</span>
        </li>
        <li>
          Before locking anything, they pre-sign{' '}
          <span className="text-orange-400">one settlement transaction per outcome</span>
        </li>
        <li>
          Those signatures are <span className="text-orange-400">encrypted</span> (&ldquo;adaptor
          signatures&rdquo;) — only the oracle&apos;s future signature on the real outcome can
          decrypt the matching one
        </li>
      </ol>
    ),
    notes: [
      'Discreet Log Contract — discreet as in private, and a pun on discrete logarithms.',
      'Two parties fund a completely ordinary-looking 2-of-2 multisig.',
      'The magic: before any money moves, every possible ending of the contract is already signed — but the signatures are encrypted. Adaptor signatures.',
      'When the oracle later signs the actual outcome, that signature is the decryption key for exactly one pre-signed transaction. The others are dead forever.',
    ],
  },
  {
    title: 'The whole protocol in one picture',
    body: (
      <div className="bg-white rounded-lg p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dlc_overview.png" alt="DLC protocol overview (dlcspecs)" className="w-full" />
      </div>
    ),
    notes: [
      'This is the official diagram from the DLC specifications (dlcspecs on GitHub) — the same spec every DLC implementation follows.',
      'Left to right: the oracle announces an event; the two parties negotiate offer, accept, and sign messages off-chain; they broadcast one funding transaction; the oracle attests; one Contract Execution Transaction (CET) spends the funds per the agreed payout.',
      'Point out: the oracle line never touches the parties. It broadcasts to the world; it does not talk to us.',
      'Everything in the boxes is exactly what you will click through today.',
    ],
  },
  {
    title: 'The oracle — what it is and is not',
    body: (
      <ul className="space-y-4 text-2xl">
        <li>
          Publishes exactly two things: an <span className="text-orange-400">announcement</span>{' '}
          (&ldquo;I will sign the World Cup result, here is my one-time nonce&rdquo;) and an{' '}
          <span className="text-orange-400">attestation</span> (the signature on{' '}
          <code className="text-orange-400">spain</code>)
        </li>
        <li>Never sees the contract, the parties, the addresses, or the amounts</li>
        <li>
          <span className="text-orange-400">Cannot steal funds</span> — it&apos;s a referee shouting
          the score into the void
        </li>
      </ul>
    ),
    notes: [
      'The oracle is the part everyone worries about, so be precise here.',
      'It publishes an announcement before the event and an attestation after. That is its entire job.',
      'It never sees the contract. It does not know we exist. Anyone can build contracts on its announcements without asking permission.',
      'It cannot redirect money to itself — the only possible destinations were fixed when the two parties signed.',
    ],
  },
  {
    title: 'If things go wrong',
    body: (
      <ul className="space-y-4 text-2xl">
        <li>
          Oracle disappears → a <span className="text-orange-400">timelocked refund</span>{' '}
          transaction returns everyone&apos;s funds
        </li>
        <li>
          Oracle lies → it can only pick one of the pre-agreed outcomes, and the lie is a{' '}
          <span className="text-orange-400">public, provable signature</span> that destroys its
          reputation
        </li>
        <li>Counterparty vanishes mid-setup → nothing was on-chain yet, walk away</li>
      </ul>
    ),
    notes: [
      'Three failure cases, three clean answers.',
      'Oracle offline: a refund transaction with a timelock was signed at setup, so funds can never be stuck.',
      'Oracle lies: it cannot invent an outcome or pay itself — it can only pick a wrong door among the pre-agreed ones. And the false signature is public and cryptographically attributable. Reputation is the collateral.',
      'And until the funding transaction broadcasts, nothing is at risk — the offer/accept/sign messages are just bytes.',
    ],
  },
  {
    title: "It's a real wire protocol",
    body: (
      <div className="space-y-4">
        <p className="text-xl text-zinc-400">
          Offer / accept / sign are standardized messages ({'dlcspecs'}). Today they travel by
          copy-paste; in production, over the network:
        </p>
        {code(`import { DlcOffer } from '@node-dlc/messaging';

const offer = DlcOffer.deserialize(Buffer.from(hex, 'hex'));
offer.contractInfo.totalCollateral; // 100000n
offer.serialize().toString('hex');  // byte-identical round-trip`)}
      </div>
    ),
    notes: [
      'The hex blobs you will copy between tabs are not app-specific — they are the standard DLC messages from the dlcspecs repo, the same spec suredbits, Atomic Finance, and Lygos implement.',
      'The @node-dlc TypeScript library parses and produces them: paste any offer hex into DlcOffer.deserialize and you get a full object — collateral, payout table, funding inputs.',
      'That means what you build today interoperates: your counterparty could be running completely different software.',
      'The "Learn" page on the app has runnable snippets for this.',
    ],
  },
  {
    title: 'This is live tech',
    body: (
      <ul className="space-y-4 text-2xl">
        <li>Atomic Finance ran Bitcoin options on DLCs</li>
        <li>
          <span className="text-orange-400">Lygos runs Bitcoin-collateralized lending on DLCs
          today</span>
        </li>
        <li>
          Demo 2 is the <em>production</em> loan contract: four outcomes, four signatures, ~5
          seconds to set up
        </li>
      </ul>
    ),
    notes: [
      'This is not whiteboard tech. Atomic Finance ran options on DLCs for years; Lygos runs Bitcoin-collateralized loans on them in production right now.',
      'The lending demo later is not a toy version — it is the actual contract structure Lygos uses: four enumerated outcomes covering the whole life of a loan.',
      'Four outcomes means four adaptor signatures and about five seconds of setup — which is why it even works on hardware wallets.',
    ],
  },
  {
    title: 'Today',
    body: (
      <ul className="space-y-4 text-2xl">
        <li>
          You play <span className="text-orange-400">all three roles</span> — oracle, offerer,
          accepter — in three browser tabs
        </li>
        <li>⚽ Demo 1: bet on the World Cup final (Spain vs Argentina)</li>
        <li>🏦 Demo 2: a Bitcoin-collateralized loan (the Lygos contract)</li>
        <li>Real testnet4 transactions you can watch confirm on mempool.space</li>
      </ul>
    ),
    notes: [
      'Format: everyone plays all three roles in three tabs of one browser. The messages move between tabs as hex — exactly what real peers exchange over the wire.',
      'First the bet, step by step and slow. Then the loan, faster, because it is the same machine with a different payout table.',
      'Wallets are generated in your browser and funded with testnet4 sats — I will send sats to your addresses in a moment.',
      'Now: everyone open the URL on the next slide.',
    ],
  },
  {
    title: 'Open this now',
    body: (
      <div className="space-y-8 text-center">
        <p className="text-4xl md:text-5xl font-bold text-orange-400">{APP_URL}</p>
        <p className="text-zinc-400 text-xl">Chrome recommended · wait for “✓ DLC engine loaded”</p>
        <div className="text-left max-w-xl mx-auto space-y-2">
          <p className="text-zinc-400">Want to run it yourself later?</p>
          {code(`git clone https://github.com/LygosLabs/btcpp-dlc-workshop
cd btcpp-dlc-workshop && pnpm install && pnpm dev`)}
        </div>
      </div>
    ),
    notes: [
      'Leave this slide up while everyone loads the app, then switch your own screen to the app and drive from there.',
      'Checkpoint: everyone should see the green "DLC engine loaded" line on the home page. If stuck: Chrome, normal window, hard refresh.',
      'Mention the repo is open source — same URL structure, git clone and pnpm dev gives the identical app locally.',
      'Then start the funding round: attendees paste their two addresses into the room chat, you send ~60k sats to each.',
    ],
  },
];

export default function Slides() {
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setI((v) => Math.min(v + 1, SLIDES.length - 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
      if (e.key.toLowerCase() === 'n') setNotes((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const slide = SLIDES[i];

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col z-50">
      <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-10">
        <h1 className="text-3xl md:text-5xl font-bold mb-10">{slide.title}</h1>
        <div>{slide.body}</div>
      </div>

      {notes && (
        <div className="border-t border-amber-700 bg-zinc-900 px-10 py-4 max-h-[35vh] overflow-y-auto">
          <p className="text-amber-400 text-xs font-semibold mb-2">PRESENTER NOTES</p>
          <ul className="space-y-1 text-sm text-zinc-300 list-disc list-inside">
            {slide.notes.map((n, k) => (
              <li key={k}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between px-10 py-3 text-xs text-zinc-600 border-t border-zinc-900">
        <span>← → navigate · N notes</span>
        <span>
          {i + 1} / {SLIDES.length}
        </span>
      </div>
    </div>
  );
}
