import type { Metadata } from 'next';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'btc++ DLC Workshop',
  description:
    'Building Bitcoin-Native Applications with Discreet Log Contracts — btc++ Toronto 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <nav className="border-b border-zinc-800 px-6 py-4 flex items-center gap-6">
          <Link href="/" className="font-bold text-orange-400">
            btc++ DLC Workshop
          </Link>
          <Link href="/oracle" className="hover:text-orange-300">
            Oracle
          </Link>
          <Link href="/offerer" className="hover:text-orange-300">
            Offerer
          </Link>
          <Link href="/accepter" className="hover:text-orange-300">
            Accepter
          </Link>
          <Link href="/learn" className="hover:text-orange-300">
            Learn
          </Link>
          <Link href="/faq" className="hover:text-orange-300">
            FAQ
          </Link>
          <span className="ml-auto text-xs text-amber-400">
            testnet4 only — never use these keys with real funds
          </span>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
