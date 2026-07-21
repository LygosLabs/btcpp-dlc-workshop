'use client';

import { useState } from 'react';

import { EXPLORER } from '../lib/client';
import type { WalletInfo } from '../lib/wallet';

export function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-zinc-800 rounded-lg p-5 space-y-3">
      <h2 className="font-semibold">
        <span
          className={`inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full text-sm ${
            done ? 'bg-green-500 text-black' : 'bg-zinc-700'
          }`}
        >
          {done ? '✓' : n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** These are real protocol messages — let people look inside them. */
function DecodePeek({ hex, decode }: { hex: string; decode: (hex: string) => unknown }) {
  const [json, setJson] = useState<string | null>(null);
  if (!hex) return null;
  const run = () => {
    try {
      setJson(
        JSON.stringify(decode(hex), (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
      );
    } catch (e) {
      setJson(`decode failed: ${String(e)}`);
    }
  };
  return (
    <details className="text-xs" onToggle={(e) => (e.target as HTMLDetailsElement).open && run()}>
      <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none">
        🔎 decode this message (deserialize + toJSON)
      </summary>
      <pre className="mt-1 max-h-72 overflow-auto bg-zinc-900 border border-zinc-800 rounded p-2 font-mono text-zinc-300 whitespace-pre-wrap break-all">
        {json ?? 'decoding…'}
      </pre>
    </details>
  );
}

export function HexOutput({
  label,
  value,
  decode,
}: {
  label: string;
  value: string;
  decode?: (hex: string) => unknown;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">
          {label} ({Math.ceil(value.length / 2)} bytes)
        </span>
        <button
          className="text-xs px-2 py-1 rounded bg-orange-500 text-black hover:bg-orange-400"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      <textarea
        readOnly
        value={value}
        rows={3}
        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300"
      />
      {decode && <DecodePeek hex={value} decode={decode} />}
    </div>
  );
}

export function HexInput({
  label,
  value,
  onChange,
  placeholder,
  decode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  decode?: (hex: string) => unknown;
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        rows={3}
        placeholder={placeholder ?? 'paste hex here'}
        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300"
      />
      {decode && <DecodePeek hex={value} decode={decode} />}
    </div>
  );
}

export function ResetDemo({ demoId }: { demoId: string }) {
  return (
    <p className="text-xs text-zinc-600">
      <button
        className="underline hover:text-zinc-400"
        onClick={() => {
          Object.keys(localStorage)
            .filter((k) => k.startsWith(`${demoId}-`))
            .forEach((k) => localStorage.removeItem(k));
          location.reload();
        }}
      >
        reset this demo&apos;s state
      </button>{' '}
      (clears messages/txids for this demo in this tab&apos;s browser; wallets and oracle keys stay)
    </p>
  );
}

export function ActionButton({
  onClick,
  busy,
  children,
  disabled,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="px-4 py-2 rounded bg-orange-500 text-black font-semibold hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? 'working…' : children}
    </button>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <pre className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded p-3 whitespace-pre-wrap">
      {error}
    </pre>
  );
}

export function WalletPanel({
  info,
  onRefresh,
  refreshing,
}: {
  info: WalletInfo | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  if (!info) return <p className="text-zinc-500 text-sm">loading wallet…</p>;
  return (
    <div className="text-sm space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-zinc-400">Your testnet4 address:</span>
        <code className="bg-zinc-900 px-2 py-1 rounded text-orange-300 break-all">{info.address}</code>
        <button
          className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600"
          onClick={() => navigator.clipboard.writeText(info.address)}
        >
          copy
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-zinc-400">Balance:</span>
        <span className={info.balance > 0 ? 'text-green-400' : 'text-amber-400'}>
          {info.balance.toLocaleString()} sats
        </span>
        <button
          className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? '…' : 'refresh'}
        </button>
        <a
          className="text-xs text-zinc-400 underline"
          href={`${EXPLORER}/address/${info.address}`}
          target="_blank"
        >
          explorer
        </a>
      </div>
      {info.balance === 0 && (
        <p className="text-amber-400">
          Fund this address with testnet4 sats — ask the presenter, or use the{' '}
          <a className="underline" href="https://mempool.space/testnet4/faucet" target="_blank">
            mempool.space faucet
          </a>{' '}
          (free account) or{' '}
          <a className="underline" href="https://coinfaucet.eu/en/btc-testnet4/" target="_blank">
            coinfaucet.eu
          </a>{' '}
          (no login).
        </p>
      )}
    </div>
  );
}

export function VerifyCallout() {
  return (
    <div className="border border-sky-900 bg-sky-950/30 rounded-lg p-4 text-sm space-y-1">
      <p className="text-sky-300 font-semibold">🔍 Don&apos;t trust this app — verify the contract</p>
      <p className="text-zinc-400">
        You now hold the offer and accept messages. Paste both into{' '}
        <a
          href="https://lygos-dlc-verify.vercel.app"
          target="_blank"
          className="text-orange-400 hover:underline"
        >
          dlc-verify
        </a>{' '}
        — independent software that decodes the payout table, reconstructs the 2-of-2 funding
        address, and cryptographically verifies every adaptor signature. Add the oracle&apos;s
        pubkey (shown on the Oracle tab) to prove the contract really uses your oracle. Nothing
        is on-chain yet — this is the audit-before-you-fund moment.
      </p>
    </div>
  );
}

export function TxLink({ label, txid }: { label: string; txid: string }) {
  if (!txid) return null;
  return (
    <p className="text-sm">
      <span className="text-green-400">✓ {label}:</span>{' '}
      <a className="underline text-orange-300 break-all" href={`${EXPLORER}/tx/${txid}`} target="_blank">
        {txid}
      </a>
    </p>
  );
}
