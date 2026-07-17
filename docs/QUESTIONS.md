# Q&A Crib Sheet

Answers you can deliver as-is. Grouped by how often they come up. If a question goes deeper than this sheet: *"Great question — I'll take it offline; ping @matthewjablack on GitHub/Twitter and you'll get a real answer."*

## The oracle (someone always asks these)

**Can the oracle steal the funds?**
No — structurally impossible. The funds sit in a 2-of-2 multisig between the two parties; the oracle's key isn't in it. The oracle's signature can only *unlock one of the settlement transactions the parties themselves pre-signed*. There is no transaction that pays the oracle for it to unlock.

**What if the oracle lies?**
It can only "lie" by attesting one of the pre-agreed outcomes (e.g., saying Argentina won when Spain did). It can't invent an outcome or redirect funds. And the lie is a permanent, publicly verifiable signature — an oracle that lies once is dead as a business. For serious money you use multiple oracles (e.g., 2-of-3 attestations), which the DLC spec supports.

**What if the oracle disappears?**
Every DLC includes a timelocked refund transaction, pre-signed at setup. If no attestation ever arrives, both parties get their collateral back after the timeout. In today's demo that's 7 days.

**Does the oracle know about our bet?**
No. It publishes an announcement (before) and an attestation (after), both broadcast to the world. It never learns who used them, for what contract, or for how much. Thousands of contracts could settle off one attestation.

**Who runs oracles in the real world?**
Lygos uses [Magnolia](https://magnolia.financial) for loan events. Anyone can run one — it's a few hundred lines of code (ours is ~100, in `lib/oracle.ts`).

## The cryptography

**What's an adaptor signature, in plain English?**
A signature with a lock on it. Bob pre-signs "pay Alice if Spain wins," but the signature is locked such that it only becomes a valid signature if you also have the oracle's signature on the word "spain." The oracle's attestation is the key. One lock per outcome — that's why only one settlement transaction can ever go through.

**Why is only ONE outcome transaction valid at the end?**
Each outcome's adaptor signature is locked to a *different* oracle message. The oracle signs exactly one message with its committed nonce, so exactly one lock opens. (Bonus fact: if an oracle signed two outcomes with the same nonce, the nonce reuse would leak its private key — the math itself punishes equivocation.)

**What's the nonce commitment about?**
In the announcement the oracle promises: "when I sign this event's result, I'll use exactly this nonce." That promise is what lets people build the adaptor signatures *today* for a signature that only exists *in the future*.

## DLCs vs alternatives

**Why not a 2-of-3 multisig with an arbiter?**
The arbiter knows both parties, holds veto power, and must actively judge and sign at settlement. A DLC oracle knows nobody, judges nothing about your contract, and just publishes a fact. Also: on-chain, a DLC looks like a plain 2-of-2 — better privacy than an identifiable escrow setup.

**Is this like Lightning?**
Same family of tricks: 2-of-2 multisig + pre-signed off-chain transactions. Lightning routes payments; DLCs settle contracts on external facts. They compose — DLCs inside Lightning channels are an active research/engineering area.

**Why not smart contracts on Ethereum/Solana?**
You can, with different tradeoffs (custodial bridges for BTC, on-chain visibility of contract terms, fee/MEV exposure). DLCs give you contracts on *native* Bitcoin: no wrapping, no bridge, and the contract terms never touch the chain.

## The lending demo

**Why only four outcomes? Real prices are continuous.**
Because a loan's *settlement* is discrete: either it was repaid, or it wasn't, or it was liquidated. You don't need a payout for BTC = $87,431.52 — you need "did the price cross the liquidation threshold, yes/no." Collapsing the curve to four outcomes cuts setup from 1000+ signatures (1–2 min) to 4 signatures (~5 s), makes the contract human-readable, and works on hardware wallets. Full argument: [DLCs are perfect for Lending](https://mblack.io/posts/dlc-are-perfect-for-lending/).

**Where's the actual loan money (USDC)?**
Off-chain (or on another chain). The DLC secures the *collateral*; the oracle attests to whether the off-chain leg (funding, repayment) happened. The Bitcoin side never has to know what a stablecoin is.

**What if the borrower and lender want to change terms?**
It's fundamentally a 2-of-2 — with both signatures you can do anything: roll the loan over, add collateral (splicing), close early cooperatively. The DLC outcomes are the *non-cooperative* guarantees.

**Is this live with real money?**
Yes — Lygos runs this contract structure in production for BTC-collateralized loans ([lygos.finance](https://lygos.finance)). Atomic Finance ran DLC-based options before that.

## Practical / misc

**Why testnet4 and not mainnet?**
Same code, worthless coins. Everything you did today works unchanged on mainnet — the app literally takes a network parameter. (Testnet4 replaced testnet3 in 2024; it's just a fresher, less-broken test network.)

**What are the on-chain fees?**
Two transactions total per contract: one funding, one settlement. Same cost profile as any 2-of-2 multisig — cheaper than most "DeFi" interactions, and nothing about the contract logic touches the chain.

**Can others see my contract on-chain?**
They see a 2-of-2 multisig funding and one spend from it — indistinguishable from a Lightning channel or any co-signed wallet. The outcomes, the oracle, the terms: all off-chain.

**What did the hex blobs we pasted actually contain?**
Standard [DLC spec](https://github.com/discreetlogcontracts/dlcspecs) wire messages — offer (terms + funding inputs), accept (counterparty inputs + adaptor sigs), sign (the other side's sigs). Real DLC wallets exchange exactly these bytes over the network; we used clipboard as the network.

**I'm a Rust developer — where do I start?**
[dlcdevkit](https://github.com/bennyhodl/dlcdevkit) (this workshop's signing engine is its FFI bindings compiled to WASM). TypeScript: [node-dlc](https://github.com/AtomicFinance/node-dlc) + [bitcoin-abstraction-layer](https://github.com/AtomicFinance/bitcoin-abstraction-layer).

**Could this run fully in a browser at scale / on phones?**
You just watched it — the whole engine is Rust compiled to WASM running in your tab. The Lygos mobile app runs the same engine as a native library.

**What about covenants (CTV etc.)?**
If Bitcoin gets covenant opcodes, numeric payout curves become practical without pre-signing thousands of transactions — the covenant enforces the payout function directly. Until then, enumerated outcomes are the right engineering answer for lending.
