# Tutorial — Demo 1: Bet on the World Cup Final ⚽

You'll enter a real Bitcoin contract (on testnet4) that pays out based on who won the 2026 World Cup Final: **Spain vs Argentina**. Even money, winner takes all, settled by an oracle — with the oracle never touching, seeing, or controlling the funds.

**You need:** a laptop with Chrome, ~15 minutes, and some testnet4 sats (the presenter will send you some, or use the [mempool.space faucet](https://mempool.space/testnet4/faucet)).

## Setup: open three tabs

| Tab | URL | You are… |
|---|---|---|
| 🔮 Oracle | `/oracle?demo=bet` | the referee announcing and attesting the result |
| 🅐 Offerer | `/offerer?demo=bet` | Alice — backs **Spain** with 50,000 sats |
| 🅑 Accepter | `/accepter?demo=bet` | Bob — backs **Argentina** with 50,000 sats |

Normally these are three different machines that have never met. Today, you're all three.

## Step 1 — Fund both wallets

On the **Offerer** and **Accepter** tabs, each shows a testnet4 address and balance.

1. Copy each address and get sats to it (presenter, or faucet). You need ≥ 55,000 sats per side.
2. Click **refresh** until the balance shows. *(Unconfirmed is fine — expect ~15–30 s for the API to see the transaction.)*

✅ **You should see:** a green balance number on both tabs.

## Step 2 — Oracle: create the announcement

On the **Oracle** tab, click **Create announcement**.

The hex blob that appears contains: the event id (`wc2026-final`), the three possible outcomes, and a *nonce* — a one-time-use signing commitment. This commitment is what makes DLCs work: everyone can build transactions today that only become spendable when the oracle signs with that exact nonce later.

Copy the hex.

## Step 3 — Offerer: create the DLC offer

On the **Offerer** tab:

1. Paste the announcement into step 2.
2. Click **Create offer** (step 3).

*(~1–3 s.)* The offer commits Alice's 50k sats, her funding UTXOs, and the payout table: `spain` → Alice gets 100k, `argentina` → Bob gets 100k, `other` → 50/50 refund.

✅ **You should see:** a DLC offer of a few hundred bytes. Copy it.

## Step 4 — Accepter: accept the offer

On the **Accepter** tab:

1. Paste the offer into step 2.
2. Click **Accept offer**.

*(~2–5 s — this creates adaptor signatures.)* Bob adds his 50k sats and pre-signs **every possible settlement transaction** — but each signature is *encrypted to the oracle's future attestation*. They're useless unless the oracle signs the matching outcome. That's an adaptor signature.

✅ **You should see:** a DLC accept (a few KB). Copy it.

### Optional: verify the contract before funding it

You now hold the offer and the accept — the entire contract, and nothing is on-chain yet. Paste both into **[dlc-verify](https://lygos-dlc-verify.vercel.app)** and independent software will decode the payout table, reconstruct the exact 2-of-2 funding address, and cryptographically check every adaptor signature. Paste your oracle's pubkey too (shown on the Oracle tab under the announcement) and it confirms the contract really uses *your* oracle. This is the point of a standardized format: you audit the deal before a single sat moves, with software neither party controls.

## Step 5 — Offerer: sign

Back on the **Offerer** tab, paste the accept into step 4 and click **Sign accept**.

Alice verifies Bob's adaptor signatures, produces her own, and signs the funding transaction. Copy the resulting DLC sign message.

## Step 6 — Accepter: finalize and broadcast

On the **Accepter** tab, paste the sign message into step 3 and click **Finalize + broadcast**.

✅ **You should see:** a funding transaction link. Open it — 100k sats now sit in a 2-of-2 multisig output that neither party can spend alone. The only exits: one of the three pre-signed outcome transactions, or a timelocked refund a week from now.

## Step 7 — Oracle: attest

The final actually happened — the oracle now tells the world. On the **Oracle** tab, pick the real outcome (Spain won 🇪🇸) and click **Attest**. Copy the attestation.

Notice what the oracle did *not* need: the funding transaction, anyone's address, or even knowledge that this bet exists. It just signed the word `spain` with its committed nonce.

## Step 8 — Accepter: execute

On the **Accepter** tab, paste the attestation into step 4 and click **Execute DLC**.

The attestation signature *decrypts* exactly one adaptor signature — the `spain` one — turning that pre-signed transaction valid. Every other outcome's transaction stays forever unspendable.

✅ **You should see:** the settlement transaction (CET) link. Open it: the multisig pays ~100k sats to Alice. Bob's tab just broadcast the transaction that pays his counterparty — because that's the only transaction the attestation made valid.

## What just happened

- Two parties locked funds in a contract **without trusting each other**.
- A third party settled it **without ever being trusted with funds** — or even knowing the contract existed.
- If the oracle had disappeared, the timelocked refund transaction would have returned everyone's money.

If something broke along the way, flag the presenter — the most common causes are an unfunded wallet, a truncated hex paste, or clicking a step out of order.
