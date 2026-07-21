'use client';

import { OracleAnnouncement, OracleAttestation } from '@node-dlc/messaging';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { DEMOS } from '../../lib/contracts';
import { WorkshopOracle } from '../../lib/oracle';
import { usePersisted } from '../../lib/use-persisted';
import { ActionButton, ErrorBox, HexOutput, ResetDemo, Step } from '../components';

const decodeAnnouncement = (h: string) =>
  OracleAnnouncement.deserialize(Buffer.from(h, 'hex')).toJSON();
const decodeAttestation = (h: string) =>
  OracleAttestation.deserialize(Buffer.from(h, 'hex')).toJSON();

/** Oracle keys live in localStorage: one private key, one nonce per event. */
function loadOracle(eventId: string): WorkshopOracle {
  const stored = JSON.parse(localStorage.getItem('oracle-keys') ?? '{}');
  if (!stored.priv) stored.priv = new WorkshopOracle().privKey.toString('hex');
  stored.nonces = stored.nonces ?? {};
  if (!stored.nonces[eventId]) stored.nonces[eventId] = new WorkshopOracle().nonce.toString('hex');
  localStorage.setItem('oracle-keys', JSON.stringify(stored));
  return new WorkshopOracle(stored.priv, stored.nonces[eventId]);
}

function OraclePubkey({ announcementHex }: { announcementHex: string }) {
  let pubkey = '';
  try {
    pubkey = OracleAnnouncement.deserialize(Buffer.from(announcementHex, 'hex'))
      .oraclePublicKey.toString('hex');
  } catch {
    return null;
  }
  return (
    <div className="text-sm flex items-center gap-2 flex-wrap">
      <span className="text-zinc-400">Your oracle pubkey (x-only):</span>
      <code className="bg-zinc-900 px-2 py-1 rounded text-orange-300 break-all">{pubkey}</code>
      <button
        className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600"
        onClick={() => navigator.clipboard.writeText(pubkey)}
      >
        copy
      </button>
      <span className="text-zinc-500">
        — paste it into{' '}
        <a
          href="https://lygos-dlc-verify.vercel.app"
          target="_blank"
          className="underline text-zinc-400"
        >
          dlc-verify
        </a>{' '}
        to prove a contract uses <em>your</em> oracle
      </span>
    </div>
  );
}

function OraclePage() {
  const demo = DEMOS[useSearchParams().get('demo') === 'loan' ? 'loan' : 'bet'];
  const [announcementHex, setAnnouncementHex] = usePersisted(`${demo.id}-announcement-hex`);
  const [attestationHex, setAttestationHex] = usePersisted(`${demo.id}-attestation-hex`);
  const [outcome, setOutcome] = useState(demo.outcomes[0]);
  const [error, setError] = useState<string | null>(null);

  const announce = () => {
    try {
      setError(null);
      const oracle = loadOracle(demo.eventId);
      const announcement = oracle.createAnnouncement(
        demo.eventId,
        demo.outcomes,
        Math.floor(Date.now() / 1000),
      );
      setAnnouncementHex(announcement.serialize().toString('hex'));
    } catch (e) {
      setError(String(e));
    }
  };

  const attest = () => {
    try {
      setError(null);
      if (announcementHex) {
        // sanity: the announcement must exist and match this event
        const ann = OracleAnnouncement.deserialize(Buffer.from(announcementHex, 'hex'));
        if (ann.oracleEvent.eventId !== demo.eventId) throw new Error('announcement/event mismatch');
      }
      const oracle = loadOracle(demo.eventId);
      setAttestationHex(oracle.createAttestation(demo.eventId, outcome).serialize().toString('hex'));
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">🔮 Oracle — {demo.title}</h1>
        <p className="text-zinc-400 text-sm mt-1">
          The oracle knows nothing about the DLC: no parties, no addresses, no amounts. It just
          publishes a signed announcement up front and a signed attestation once the outcome is
          known.
        </p>
      </header>

      <Step n={1} title="Create the announcement" done={!!announcementHex}>
        <p className="text-sm text-zinc-400">
          The announcement commits to the event (<code>{demo.eventId}</code>), its possible
          outcomes ({demo.outcomes.join(', ')}), and a one-time signing nonce. Copy the hex and
          paste it into the Offerer tab.
        </p>
        <ActionButton onClick={announce}>Create announcement</ActionButton>
        <HexOutput label="Oracle announcement" value={announcementHex} decode={decodeAnnouncement} />
        {announcementHex && <OraclePubkey announcementHex={announcementHex} />}
      </Step>

      <Step n={2} title="Attest to the outcome" done={!!attestationHex}>
        <p className="text-sm text-zinc-400">
          After the funding transaction confirms, sign the real-world outcome. The signature
          releases exactly one of the pre-signed settlement transactions — copy it into the
          Accepter tab.
        </p>
        <div className="flex items-center gap-3">
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
          >
            {demo.outcomes.map((o) => (
              <option key={o} value={o}>
                {demo.outcomeLabels[o] ?? o}
              </option>
            ))}
          </select>
          <ActionButton onClick={attest}>Attest</ActionButton>
        </div>
        <HexOutput label="Oracle attestation" value={attestationHex} decode={decodeAttestation} />
      </Step>

      <ErrorBox error={error} />
      <ResetDemo demoId={demo.id} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <OraclePage />
    </Suspense>
  );
}
