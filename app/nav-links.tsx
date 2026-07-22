'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Nav that keeps the current demo (?demo=bet|loan) when hopping between the
 * three role tabs, plus an explicit switcher — otherwise a nav click silently
 * drops you back into the default (bet) demo mid-loan.
 */
export function NavLinks() {
  const pathname = usePathname();
  const demo = useSearchParams().get('demo') === 'loan' ? 'loan' : 'bet';
  const onDemoPage = ['/oracle', '/offerer', '/accepter'].includes(pathname);

  return (
    <>
      <Link href={`/oracle?demo=${demo}`} className="hover:text-orange-300">
        Oracle
      </Link>
      <Link href={`/offerer?demo=${demo}`} className="hover:text-orange-300">
        Offerer
      </Link>
      <Link href={`/accepter?demo=${demo}`} className="hover:text-orange-300">
        Accepter
      </Link>
      <Link href="/learn" className="hover:text-orange-300">
        Learn
      </Link>
      <Link href="/faq" className="hover:text-orange-300">
        FAQ
      </Link>
      {onDemoPage && (
        <span className="flex items-center gap-1 text-xs border border-zinc-800 rounded-full px-1 py-0.5">
          {(['bet', 'loan'] as const).map((d) => (
            <Link
              key={d}
              href={`${pathname}?demo=${d}`}
              className={`px-2 py-0.5 rounded-full ${
                demo === d ? 'bg-orange-500 text-black font-semibold' : 'text-zinc-400 hover:text-orange-300'
              }`}
            >
              {d === 'bet' ? '⚽ Bet' : '🏦 Loan'}
            </Link>
          ))}
        </span>
      )}
    </>
  );
}
