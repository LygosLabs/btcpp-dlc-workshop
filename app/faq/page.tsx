import fs from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';
import Markdown from 'react-markdown';

export const metadata: Metadata = {
  title: 'Developer FAQ — btc++ DLC Workshop',
  description: 'Questions developers ask when they start building with DLCs.',
};

const REPO = 'https://github.com/LygosLabs/btcpp-dlc-workshop/blob/master';

// docs/FAQ.md is the source of truth; rendered here at build time.
const faq = fs.readFileSync(path.join(process.cwd(), 'docs/FAQ.md'), 'utf8');

// Relative links in the doc (QUESTIONS.md, ../lib/oracle.ts) point at repo files.
const resolveHref = (href = '') =>
  href.startsWith('http') ? href : `${REPO}/${path.posix.normalize(path.posix.join('docs', href))}`;

export default function Faq() {
  return (
    <article className="space-y-4">
      <Markdown
        components={{
          h1: (p) => <h1 className="text-3xl font-bold mb-2" {...p} />,
          h2: (p) => <h2 className="text-2xl font-semibold mt-10 border-b border-zinc-800 pb-2" {...p} />,
          p: (p) => <p className="text-zinc-400 leading-relaxed" {...p} />,
          strong: (p) => <strong className="text-zinc-200" {...p} />,
          a: ({ href, ...p }) => (
            <a href={resolveHref(href)} className="text-orange-400 hover:underline" {...p} />
          ),
          ul: (p) => <ul className="text-zinc-400 space-y-2 list-disc list-inside" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          pre: (p) => (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm overflow-x-auto text-zinc-100" {...p} />
          ),
          code: (p) => <code className="text-orange-300" {...p} />,
        }}
      >
        {faq}
      </Markdown>
    </article>
  );
}
