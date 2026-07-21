'use client';

import { InputSupplementationMode } from '@atomicfinance/types';
import { DlcAccept, DlcOffer, DlcSign, OracleAnnouncement } from '@node-dlc/messaging';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { buildEnumContractInfo, DEMOS } from '../../lib/contracts';
import { usePersisted } from '../../lib/use-persisted';
import {
  buildBrowserClient,
  getFundingInputs,
  getWalletInfo,
  type WalletInfo,
} from '../../lib/wallet';
import {
  ActionButton,
  ErrorBox,
  HexInput,
  HexOutput,
  ResetDemo,
  Step,
  VerifyCallout,
  WalletPanel,
} from '../components';

const decoders = {
  announcement: (h: string) => OracleAnnouncement.deserialize(Buffer.from(h, 'hex')).toJSON(),
  offer: (h: string) => DlcOffer.deserialize(Buffer.from(h, 'hex')).toJSON(),
  accept: (h: string) => DlcAccept.deserialize(Buffer.from(h, 'hex')).toJSON(),
  sign: (h: string) => DlcSign.deserialize(Buffer.from(h, 'hex')).toJSON(),
};

type BrowserClient = Awaited<ReturnType<typeof buildBrowserClient>>;

function OffererPage() {
  const demo = DEMOS[useSearchParams().get('demo') === 'loan' ? 'loan' : 'bet'];
  const [client, setClient] = useState<BrowserClient | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [announcementHex, setAnnouncementHex] = usePersisted(`${demo.id}-announcement-hex`);
  const [offerHex, setOfferHex] = usePersisted(`${demo.id}-offer-hex`);
  const [acceptHex, setAcceptHex] = usePersisted(`${demo.id}-accept-hex`);
  const [signHex, setSignHex] = usePersisted(`${demo.id}-sign-hex`);

  const refreshWallet = useCallback(async (c: BrowserClient) => {
    setRefreshing(true);
    try {
      setWallet(await getWalletInfo(c));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    buildBrowserClient('offerer')
      .then(async (c) => {
        setClient(c);
        await refreshWallet(c);
      })
      .catch((e) => setError(String(e)));
  }, [refreshWallet]);

  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const createOffer = run(async () => {
    if (!client || !wallet) throw new Error('wallet not ready');
    if (wallet.balance < Number(demo.offerCollateral) + 5000)
      throw new Error(
        `Not enough sats: need ~${Number(demo.offerCollateral) + 5000}, have ${wallet.balance}`,
      );
    const announcement = OracleAnnouncement.deserialize(Buffer.from(announcementHex, 'hex'));
    const contractInfo = buildEnumContractInfo(announcement, demo.payouts, demo.totalCollateral);
    const now = Math.floor(Date.now() / 1000);
    const inputs = await getFundingInputs(wallet);
    const dlcOffer = await client.dlc.createDlcOffer(
      contractInfo,
      demo.offerCollateral,
      2n, // sats/vB — plenty for testnet4
      now, // cetLocktime: executable as soon as the oracle attests
      now + 7 * 24 * 3600, // refundLocktime: escape hatch if the oracle vanishes
      inputs,
      InputSupplementationMode.None,
    );
    setOfferHex(dlcOffer.serialize().toString('hex'));
  });

  const signAccept = run(async () => {
    if (!client) throw new Error('wallet not ready');
    const dlcOffer = DlcOffer.deserialize(Buffer.from(offerHex, 'hex'));
    const dlcAccept = DlcAccept.deserialize(Buffer.from(acceptHex, 'hex'));
    const { dlcSign } = await client.dlc.signDlcAccept(dlcOffer, dlcAccept);
    setSignHex(dlcSign.serialize().toString('hex'));
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">🅐 Offerer — {demo.title}</h1>
        <p className="text-zinc-400 text-sm mt-1">You are the offerer: {demo.offererRole}.</p>
      </header>

      <Step n={1} title="Fund your wallet" done={(wallet?.balance ?? 0) > 0}>
        <WalletPanel info={wallet} onRefresh={() => client && refreshWallet(client)} refreshing={refreshing} />
      </Step>

      <Step n={2} title="Paste the oracle announcement" done={!!announcementHex}>
        <HexInput
          label="Oracle announcement (from the Oracle tab)"
          value={announcementHex}
          onChange={setAnnouncementHex}
          decode={decoders.announcement}
        />
      </Step>

      <Step n={3} title="Create the DLC offer" done={!!offerHex}>
        <p className="text-sm text-zinc-400">
          The offer commits your collateral ({demo.offerCollateral.toLocaleString()} sats), the
          payout table, and your funding UTXOs. Copy it into the Accepter tab.
        </p>
        <ActionButton onClick={createOffer} busy={busy} disabled={!announcementHex || !wallet}>
          Create offer
        </ActionButton>
        <HexOutput label="DLC offer" value={offerHex} decode={decoders.offer} />
      </Step>

      <Step n={4} title="Sign the accept message" done={!!signHex}>
        <p className="text-sm text-zinc-400">
          The accept message contains the accepter&apos;s funding inputs and adaptor signatures.
          Signing produces your own adaptor signatures plus funding signatures — one signature per
          possible outcome, {demo.outcomes.length} in total. Copy the result back to the Accepter
          tab.
        </p>
        <HexInput
          label="DLC accept (from the Accepter tab)"
          value={acceptHex}
          onChange={setAcceptHex}
          decode={decoders.accept}
        />
        {offerHex && acceptHex && <VerifyCallout />}
        <ActionButton onClick={signAccept} busy={busy} disabled={!acceptHex || !offerHex}>
          Sign accept
        </ActionButton>
        <HexOutput label="DLC sign" value={signHex} decode={decoders.sign} />
      </Step>

      <ErrorBox error={error} />
      <ResetDemo demoId={demo.id} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <OffererPage />
    </Suspense>
  );
}
