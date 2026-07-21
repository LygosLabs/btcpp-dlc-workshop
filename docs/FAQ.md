# Developer FAQ

Questions developers ask when they go from clicking through the workshop to building with DLCs — including every sharp edge we hit building this app. Attendee-level Q&A lives in [QUESTIONS.md](QUESTIONS.md).

## The stack

**What libraries does this use, exactly?**

- [`@node-dlc/*` 1.2.x](https://github.com/AtomicFinance/node-dlc) — DLC message types (offer/accept/sign, announcements, attestations) and serialization. Pure TypeScript.
- [`@atomicfinance/*` 4.3.x (bitcoin-abstraction-layer)](https://github.com/AtomicFinance/bitcoin-abstraction-layer) — the client: wallet provider, esplora chain provider, and `BitcoinDdkProvider` for DLC operations.
- [`@bennyblader/ddk-ts` (ddk-ffi)](https://github.com/bennyhodl/ddk-ffi) — Rust DLC transaction engine ([dlcdevkit](https://github.com/bennyhodl/dlcdevkit) / rust-dlc lineage) with napi bindings. Since 0.3.43 it publishes a `wasm32-wasip1-threads` build, which is how it runs in the browser here.

**Why does DLC signing happen in Rust/wasm instead of JS?**
The adaptor-signature and CET-construction logic lives in rust-dlc/`ddk`, which is the battle-tested implementation. Rather than reimplement it in JS, `BitcoinDdkProvider` calls the Rust engine through bindings — natively in Node, as wasm in the browser. Same code, both places.

**Is the wasm build on npm?**
Yes — `@bennyblader/ddk-ts@0.3.43+` ships the wasm target via the `@bennyblader/ddk-ts-wasm32-wasi` optional dependency (this repo uses it directly; pnpm needs the `supportedArchitectures.cpu: ["wasm32"]` hint in `package.json`). Native Node use needs nothing special; browser use needs the COOP/COEP headers below.

## Working with messages

**How do I inspect the hex the app produces?**

```ts
import { DlcOffer } from '@node-dlc/messaging';
const offer = DlcOffer.deserialize(Buffer.from(hex, 'hex'));
```

Every message type round-trips byte-for-byte through `serialize()`/`deserialize()`. See the [Learn page](https://btcpp-dlc-workshop.vercel.app/learn) for a full example.

**Are these messages compatible with other DLC software?**
Yes — they follow [dlcspecs](https://github.com/discreetlogcontracts/dlcspecs). node-dlc, rust-dlc/dlcdevkit, and bitcoin-s interoperate at the message level.

**How do I verify a DLC without trusting the software that made it?**
Paste the offer + accept hex into [dlc-verify](https://lygos-dlc-verify.vercel.app) ([source](https://github.com/LygosLabs/dlc-verify)). It independently decodes the payout table and collaterals, reconstructs the 2-of-2 funding address, extracts and checks the oracle pubkey (paste your expected pubkey for an explicit match), and cryptographically verifies every CET adaptor signature against the oracle's announced nonce — all before anything is broadcast. Workshop hex verifies as-is.

**Wire format facts worth knowing** (from [dlcspecs Protocol.md](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Protocol.md) / [Transactions.md](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Transactions.md)):

- Messages carry their type number up front: offer = 42778 (hex starts `a71a`), accept = 42780 (`a71c`), sign = 42782 (`a71e`).
- `contract_id` = funding txid XOR `temporary_contract_id` XOR (funding output index); the temporary id is the SHA256 of the offer.
- The funding output is a plain 2-of-2 P2WSH with the pubkeys sorted per BIP 67 — on-chain it's indistinguishable from any other multisig (that's the privacy story).
- `cet_locktime < refund_locktime`, and both must be the same kind (both block heights or both timestamps).
- Minimums: each party's collateral ≥ 1000 sats; CET outputs under 1000 sats are omitted as dust.
- Fees are paid up front out of the funding output, so CETs pay out exact contract amounts.
- All funding inputs must be segwit (or P2SH-wrapped segwit) — malleability protection.

**Gotcha: adaptor signatures split on deserialize.**
A DLC adaptor signature is 162 bytes. Live in-memory objects from BAL carry all 162 bytes in `encryptedSig`; after a serialize/deserialize round-trip, `@node-dlc/messaging` splits them into `encryptedSig` (65) + `dleqProof` (97). If you hand-roll code that consumes adaptor sigs, handle both shapes. (BAL's `execute` had exactly this bug — fixed in [bitcoin-abstraction-layer#212](https://github.com/AtomicFinance/bitcoin-abstraction-layer/pull/212).)

## Oracles

**Gotcha: DDK attestation hashing.**
DDK/rust-dlc expects enum attestations to sign `taggedHash('DLC/oracle/attestation/v0', outcome)` over the **raw outcome string** (UTF-8) — *not* `sha256(outcome)`. Announcements sign `taggedHash('DLC/oracle/announcement/v0', oracleEvent.serialize())`. Get this wrong and `execute` fails with signature errors. Reference implementation: [`lib/oracle.ts`](../lib/oracle.ts) (~100 lines, pure JS).

**The attestation must use the committed nonce.**
The announcement commits to a one-time nonce; the attestation must be a BIP340 signature using exactly that nonce (that's what makes CET decryption work, and what makes double-attesting leak the oracle's key). A random-nonce signature over the outcome will not unlock anything.

**Is there a production oracle I can use?**
Lygos uses Magnolia Financial's oracle in production. For development, running your own (as this app does) is ~100 lines.

## Networks & infrastructure

**Gotcha: testnet4 network config.**
There is no `bitcoin_testnet4` network object in BAL — use `BitcoinNetworks.bitcoin_testnet`. Testnet4 shares testnet3's address prefixes (`tb1`) and coin type, so only the esplora URL changes: `https://mempool.space/testnet4/api`.

**Why does the browser build need COOP/COEP headers?**
The wasm build targets `wasm32-wasip1-threads`, which uses `SharedArrayBuffer` for its thread pool. Browsers only enable `SharedArrayBuffer` on cross-origin-isolated pages, so the app sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (see `next.config.mjs`). Consequence: every cross-origin resource you load needs CORS/CORP headers (mempool.space's API is fine).

**Gotcha: `getUnusedAddress` and address reuse.**
BAL resolves methods to the *last-added* provider that implements them — monkey-patching a provider instance does nothing. Also, DDK requires the payout address ≠ funding address. This app adds a small `FixedAddressProvider` after the wallet provider (see `lib/client.ts`) to control address selection and skip the ~50-request gap-limit scan.

## Running & building

**How do I run the app locally?**

```bash
git clone https://github.com/LygosLabs/btcpp-dlc-workshop
cd btcpp-dlc-workshop && pnpm install && pnpm dev
```

**How do I run a full DLC lifecycle without a browser?**
`pnpm exec tsx scripts/spike-e2e.ts` — two BAL clients + a self-oracle settling a real contract on testnet4. Needs `ALICE_MNEMONIC`/`BOB_MNEMONIC` in `.env` with funded wallets.

**How was the wasm artifact built?**

```bash
rustup target add wasm32-wasip1-threads
# wasi-sdk needed for the secp256k1-zkp C code
WASI_SDK_PATH=~/wasi-sdk-33 pnpm napi build --platform --release \
  --js index.js --dts index.d.ts --output-dir dist --target wasm32-wasip1-threads
```

Upstreamed in [ddk-ffi#19](https://github.com/bennyhodl/ddk-ffi/pull/19); published as `@bennyblader/ddk-ts-wasm32-wasi` from 0.3.43.

**Where do keys live in this app?**
Mnemonics in `localStorage`, unencrypted, generated per browser. Fine for testnet4 throwaways; obviously not a wallet architecture. Never send real funds to these addresses.

## Going further

**I want to build a real DLC application. Where do I start?**
- TypeScript: this repo's `lib/` is a minimal, complete example — start from `scripts/spike-e2e.ts`.
- Rust: [dlcdevkit](https://github.com/bennyhodl/dlcdevkit) gives you a full DLC node (wallet, storage, transport).
- Read the [dlcspecs Introduction](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Introduction.md) before anything else.

**Enumerated vs numeric outcomes?**
Enumerated: a handful of outcomes, one adaptor sig each, seconds to set up. Numeric (price curves): thousands of CETs via digit decomposition, minutes of signing. [DLCs are perfect for Lending](https://mblack.io/posts/dlc-are-perfect-for-lending/) argues most real products (including loans) only need enumerated — that's what Lygos ships.
