# Tutorial — Demo 2: A Bitcoin-Collateralized Loan 🏦

This is not a toy: it's the exact contract structure [Lygos Finance](https://lygos.finance) uses for BTC-collateralized loans in production, scaled down to a demo. Background reading: [DLCs are perfect for Lending](https://mblack.io/posts/dlc-are-perfect-for-lending/).

## The idea: a loan only has four endings

A numeric DLC would pre-sign a payout for every possible BTC price — thousands of adaptor signatures, 1–2 minutes of compute, and a contract nobody can eyeball. But for a loan, only four things can happen to the collateral:

| Outcome | What happened | Collateral goes to |
|---|---|---|
| `not-funded` | Lender never sent the loan (48 h timeout) | Borrower |
| `repaid` | Borrower repaid principal + interest | Borrower |
| `liquidated-by-price` | BTC price fell through the liquidation threshold | Lender |
| `liquidated-by-maturity` | Loan matured unpaid | Lender |

Four outcomes → four adaptor signatures → ~5 seconds to set up, and a borrower can read all four pre-signed transactions and know *exactly* where their Bitcoin can go. That's why this runs on hardware wallets while numeric DLCs can't.

## Roles

| Tab | URL | You are… |
|---|---|---|
| 🔮 Oracle | `/oracle?demo=loan` | the loan oracle (Lygos uses [Magnolia](https://magnolia.financial)) — it watches loan events and attests |
| 🅐 Offerer | `/offerer?demo=loan` | the **borrower** — posts 100,000 sats of BTC collateral |
| 🅑 Accepter | `/accepter?demo=loan` | the **lender** — posts a 10,000 sat stake (stands in for the fiat/stablecoin loan, which happens off-chain) |

## The flow

Mechanically it's the same 8 steps as the betting demo — fund both wallets, announce, offer, accept, sign, finalize, attest, execute. Follow the steps on each page in order. The differences worth noticing:

**The payout table (step 3, offerer).** `not-funded` and `repaid` return the collateral to the borrower; both liquidation outcomes hand it to the lender. When you create the offer, you're pre-committing to all four — there is no scenario where the funds go anywhere else. This is what "non-custodial lending" means: after funding, *neither Lygos nor the lender can take the collateral outside these four rules*. Don't take the app's word for it: after the accept step, paste the offer + accept hex into [dlc-verify](https://lygos-dlc-verify.vercel.app) and watch independent software print those four outcomes and verify every signature — exactly what a borrower would do before funding a real loan.

**What the oracle watches (step 7, oracle).** In production, the oracle isn't watching a football match — it monitors: did the loan get funded within 48 h? did a repayment arrive? did the price cross the liquidation threshold? did maturity pass? It attests to whichever event occurred. Try attesting `repaid` first (the happy path): the collateral returns to the borrower. If time allows, reset and run a `liquidated-by-price` scenario — same mechanics, opposite payout.

**The refund path.** Just like the bet, there's a timelocked refund transaction. If Lygos disappears *and* the oracle disappears, the borrower still gets their Bitcoin back when the timelock expires. No one needs to stay alive for your money to be safe.

## Why this beats a 2-of-3 multisig with an arbiter

| | Multisig arbiter | DLC oracle |
|---|---|---|
| Knows who you are | Yes | No |
| Knows where the funds are | Yes | No |
| Acts at settlement time | Must actively judge and sign | Just publishes an attestation |
| Can collude/steal | With either party | Can't move funds at all — worst case is attesting falsely, which is publicly provable |

## What Lygos adds in production

Same contract, plus: a real price oracle (Magnolia) with signed liquidation events, USDC/USDT loan legs, loan rollovers (it's just a 2-of-2 — the parties can cooperatively re-sign), splice-in collateral top-ups, and hardware-wallet signing (four signatures is nothing for a Ledger).
