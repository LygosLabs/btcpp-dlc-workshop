# btc++ DLC Workshop — Building Bitcoin-Native Applications with Discreet Log Contracts

Workshop for [btc++ Toronto 2026](https://btcpp.dev/toronto) by [Lygos Finance](https://lygos.finance).

Attendees build and settle real Discreet Log Contracts (DLCs) on Bitcoin **testnet4**, entirely in the browser — wallet, DLC signing (via a WASM build of [dlcdevkit](https://github.com/bennyhodl/dlcdevkit)'s bindings), and a self-run oracle.

## The two demos

| | Demo 1 — Betting ⚽ | Demo 2 — Lending 🏦 |
|---|---|---|
| Event | FIFA World Cup Final: Spain vs Argentina | A Bitcoin-collateralized loan |
| Outcomes | `spain`, `argentina`, `other` | `not-funded`, `repaid`, `liquidated-by-price`, `liquidated-by-maturity` |
| Structure | Even-money, winner takes all | Borrower posts collateral; oracle attests to what happened to the loan |
| Why it matters | The classic DLC use case | Exactly how Lygos loans work in production — see [DLCs are perfect for Lending](https://mblack.io/posts/dlc-are-perfect-for-lending/) |

Both are **enumerated-outcome DLCs**: a handful of outcomes, one adaptor signature each, ~seconds to set up. (Numeric payout curves need thousands of signatures and minutes of compute — the lending post explains why we don't need them.)

## Run it

**Hosted (workshop mode):** open **[btcpp-dlc-workshop.vercel.app](https://btcpp-dlc-workshop.vercel.app)** — no setup needed. Each browser generates its own throwaway testnet4 wallets in localStorage.

**Local:**

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

> ⚠️ Everything here is testnet-only. Keys live unencrypted in your browser's localStorage. Never use them with real funds.

## How a DLC flows through the app

Open three tabs: **Oracle**, **Offerer**, **Accepter**. Messages move between tabs as hex — the same messages real DLC peers exchange over the wire ([dlcspecs](https://github.com/discreetlogcontracts/dlcspecs)).

```
Oracle          Offerer                    Accepter
  |  announcement  |                          |
  |--------------->|  DLC offer               |
  |                |------------------------->|
  |                |               DLC accept |
  |                |<-------------------------|
  |                |  DLC sign                |
  |                |------------------------->|
  |                |                          |-- broadcast funding tx
  |  attestation   |                          |
  |------------------------------------------>|-- broadcast settlement (CET)
```

Step-by-step guides: [docs/tutorial-betting.md](docs/tutorial-betting.md) · [docs/tutorial-lending.md](docs/tutorial-lending.md)

Running the session? Read [docs/RUNBOOK.md](docs/RUNBOOK.md) first, then [docs/QUESTIONS.md](docs/QUESTIONS.md).

## What's under the hood

- [bitcoin-abstraction-layer](https://github.com/AtomicFinance/bitcoin-abstraction-layer) (BAL) 4.3.2 — wallet + DLC client (`BitcoinDdkProvider`)
- [node-dlc](https://github.com/AtomicFinance/node-dlc) 1.2.x — DLC protocol messages (offer/accept/sign, announcements, attestations)
- [ddk-ffi](https://github.com/bennyhodl/ddk-ffi) / [dlcdevkit](https://github.com/bennyhodl/dlcdevkit) — Rust DLC transaction engine, compiled to `wasm32-wasip1-threads` so it runs in the browser (`vendor/ddk-ts`)
- Oracle: ~100 lines of pure JS ([lib/oracle.ts](lib/oracle.ts)) — BIP340 signing with a committed nonce
- Chain data: [mempool.space/testnet4](https://mempool.space/testnet4) esplora API

The wasm build needs `SharedArrayBuffer`, so the app ships COOP/COEP headers (see `next.config.mjs`). Use Chrome or Firefox; recent Safari also works.

## Before the workshop (attendees)

1. Read the [Introduction to DLCs](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Introduction.md)
2. Bring a laptop with Chrome — that's it, everything runs in the browser
3. Optional deeper dives: [Discreet Log Contracts part 1–4](https://mblack.io/posts/discreet-log-contracts-part-1-what-is-a-discreet-log-contract/), the [DLC whitepaper](https://adiabat.github.io/dlc.pdf)

## Repo layout

```
app/            Next.js pages: /, /oracle, /offerer, /accepter
lib/            oracle, contract builders, BAL client setup, wallet helpers
docs/           tutorials, presenter runbook, Q&A
scripts/        spike-e2e.ts (Node end-to-end on testnet4), browser tests
vendor/ddk-ts/  vendored ddk-ts build with the wasm32-wasip1-threads artifact
```
