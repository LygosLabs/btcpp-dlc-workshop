# Presenter Runbook — btc++ DLC Workshop

Everything you need to run this workshop start to finish. You don't need to be a DLC expert: the talking points are written out, the demo drives itself, and [QUESTIONS.md](QUESTIONS.md) has answers to everything attendees usually ask. Read this doc fully once the day before.

**Session shape:** 90 minutes. Intro talk (10) → setup & funding (10) → betting demo (30) → lending demo (20) → on-chain review + Q&A (20).

**The app:** https://btcpp-dlc-workshop.vercel.app

---

## T-1 day checklist

- [ ] Open the hosted app and run the **entire betting demo yourself**, all 8 tutorial steps, three tabs. This is the single highest-value prep item — you'll hit any snag before the room does.
- [ ] Run the lending demo the same way (attest `repaid`).
- [ ] Check your **funding wallet** has enough testnet4 sats: budget ~150k sats per attendee pair, plus 500k spare. (Matt maintains the stash — confirm with him.)
- [ ] Confirm [mempool.space/testnet4](https://mempool.space/testnet4) is up and blocks are flowing (testnet4 blocks are ~10 min like mainnet, sometimes bursty).
- [ ] Skim [QUESTIONS.md](QUESTIONS.md) once.
- [ ] Bookmark: the app, mempool.space/testnet4, and the [lending blog post](https://mblack.io/posts/dlc-are-perfect-for-lending/).

## T-30 minutes checklist

- [ ] Projector + wifi test; open the app's three tabs (bet demo) in your presenting browser.
- [ ] In a **second browser profile**, keep your completed run from yesterday open — if live demo gods misbehave, you can show the finished state instantly.
- [ ] Have your funding wallet open and unlocked, ready to send sats to attendee addresses.
- [ ] Open **[/slides](https://btcpp-dlc-workshop.vercel.app/slides)** full-screen in its own window — the intro talk and the big-URL slide live there. Arrow keys navigate; press **N** to see per-slide presenter notes.

---

## 0:00–0:10 — Intro talk

Present from **[/slides](https://btcpp-dlc-workshop.vercel.app/slides)** — 10 slides matching the talking points below, ending on the big-URL slide. Press **N** for word-for-word presenter notes on each slide; rehearse with them, then present with notes off if you're comfortable. The last slide stays up while the room loads the app, then you switch to the app and drive from there.

Talking points (say it in your own words; each bullet is ~1 minute):

- **The problem.** Bitcoin script can't say "pay whoever won the World Cup" — it doesn't know about the outside world. Any contract about real-world events needs someone to bring the truth on-chain. The naive way: give a middleman your money and trust them. The DLC way: nobody holds your money, ever.
- **What a DLC is.** Two parties lock funds in a 2-of-2 multisig. Before locking anything, they pre-sign one settlement transaction per possible outcome. The trick: those signatures are *encrypted* ("adaptor signatures") such that only an oracle's future signature on the actual outcome can decrypt the matching one.
- **What the oracle is — and isn't.** The oracle publishes two things ever: an *announcement* ("I will sign the World Cup result on July 19, here's my one-time nonce") and an *attestation* (the signature on `spain`). It never sees the contract, the parties, the addresses, or the amounts. It cannot steal funds. It's a referee who shouts the score into the void — anyone can build contracts on it without asking permission.
- **If things go wrong.** Oracle disappears? A timelocked refund transaction returns everyone's funds. Oracle lies? It can only pick one of the pre-agreed outcomes — it can't redirect money to itself — and its lie is a public, provable signature that destroys its reputation.
- **Why you should care.** This is live tech: Atomic Finance ran options on it, Lygos runs Bitcoin-collateralized lending on it today. Demo 2 is literally the production loan contract.
- **Today.** "You'll each play all three roles — oracle, and both bettors — in three browser tabs, on testnet4, with real transactions you can watch confirm."

## 0:10–0:20 — Setup & funding

1. Everyone opens the app URL → home page. Confirm they see "✓ DLC engine loaded". *(If someone's stuck loading: use Chrome, hard-refresh.)*
2. Everyone opens the three tabs (Oracle / Offerer / Accepter, bet demo).
3. **Funding round:** attendees paste their two addresses into the room chat (or come show you); you send **~60k sats to each address** from the funding wallet. Start this early — it's the slowest part. Faucet as backup: mempool.space/testnet4/faucet.
4. While sats propagate: walk through the home page diagram — who sends what to whom.

> Checkpoint before moving on: **"Raise your hand if both your wallets show a balance."** Help stragglers; pair anyone unfunded with a neighbor.

## 0:20–0:50 — Betting demo

Drive it live on the projector; attendees follow [tutorial-betting.md](tutorial-betting.md). Per step: do it, say the one-liner, checkpoint the room.

| Step | What you do | The one-liner to say | Checkpoint |
|---|---|---|---|
| Announce | Oracle tab → Create announcement | "The oracle commits to a one-time nonce — everything else builds on this promise." | Everyone has hex |
| Offer | Paste announcement → Create offer | "Alice commits her 50k, her UTXOs, and the full payout table. Nothing is on-chain yet." | Offer hex visible |
| Accept | Paste offer → Accept | "Bob pre-signs *every* ending of this bet — but encrypted. These are adaptor signatures." | Accept hex (it's big — that's the sigs) |
| Sign | Paste accept → Sign | "Alice verifies Bob's sigs and adds her own. Still nothing on-chain." | Sign hex |
| Finalize | Paste sign → Finalize + broadcast | "NOW money moves: 100k sats into a 2-of-2 that only the pre-signed outcomes can spend." | Open the funding tx on mempool.space — projector moment |
| Attest | Oracle tab → pick Spain → Attest | "The oracle signs one word with its committed nonce. It still doesn't know we exist." | Attestation hex |
| Execute | Paste attestation → Execute | "That signature decrypts exactly one of the pre-signed transactions. The others are dead forever." | Open the CET — show the payout to Alice |

Common per-step failures → see troubleshooting table below.

## 0:50–1:10 — Lending demo

Switch all three tabs to `?demo=loan` (links on the home page). Same mechanics, so go faster — the value here is the narrative:

- "Same machine, different payout table. Four outcomes is all a loan needs." Show the four outcomes on the offerer page.
- "This is not a demo version of Lygos — this *is* the Lygos contract." Mention: numeric curves = 1000+ sigs and 2 minutes; this = 4 sigs and 5 seconds; that's why it works on hardware wallets.
- Attest **`repaid`** → collateral returns to the borrower. Point at the CET on the explorer.
- Close with the trust story: "After funding, there is no action Lygos, the lender, or the oracle can take that sends this Bitcoin anywhere but these four places. And if everyone vanishes, the timelock refund fires."

## 1:10–1:30 — Wrap-up + Q&A

- On mempool.space, click through the whole chain: funding tx → CET. "Notice it looks like any 2-of-2 multisig — DLCs are invisible on-chain. Privacy by construction."
- Where to go next: this repo (it's open source), [dlcspecs](https://github.com/discreetlogcontracts/dlcspecs), [dlcdevkit](https://github.com/bennyhodl/dlcdevkit) for Rust folks, [lygos.finance](https://lygos.finance) to see it in production.
- Open Q&A — answers in [QUESTIONS.md](QUESTIONS.md). If truly stumped: "Great question — ping @matthewjablack on Twitter/GitHub, he'll answer."

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Balance stays 0 after funding | API lag or wrong address | Wait 30 s, click refresh; verify the address on mempool.space — if the tx shows there, just wait |
| "Not enough sats" on offer/accept | Underfunded | Send more from the funding wallet (needs collateral + ~5k fee buffer) |
| Error on any paste step | Truncated/whitespace hex | Re-copy with the copy button, paste fresh; check byte count roughly matches the sender's |
| "announcement/event mismatch" or weird deserialize error | Mixed demos (bet hex in loan tab) or stale state | Make sure all three tabs use the same `?demo=`; worst case clear localStorage for the site and restart the flow |
| Attendee closed/refreshed a tab | — | No problem — everything persists in localStorage; reopen and continue |
| Execute fails with signature error | Attestation from the wrong browser profile (different oracle keys) | Oracle, offerer, accepter tabs must share one browser profile; re-announce and re-run |
| Funding broadcast rejected | Fee too low / input spent | Check the input on the explorer; re-run from the offer step with fresh UTXOs |
| Page stuck "loading DLC engine" | Old browser / extensions blocking workers | Chrome, normal window, hard refresh |
| Room-wide API slowness | mempool.space rate limiting | Slow the pace; stagger the room ("left half click first") |
| Everything is on fire | — | Switch to your pre-completed second browser profile and narrate the finished state |

## If you have extra time

- Run the `other` outcome on a fresh bet — show the 50/50 refund.
- Run `liquidated-by-price` on a fresh loan — show the collateral going to the lender.
- Show `lib/oracle.ts` — the entire oracle is ~100 lines.
