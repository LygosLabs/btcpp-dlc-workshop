'use client';

import {
  DlcAccept,
  DlcOffer,
  DlcSign,
  DlcTransactions,
  OracleAttestation,
} from '@node-dlc/messaging';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { DEMOS } from '../../lib/contracts';
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
  Step,
  TxLink,
  VerifyCallout,
  WalletPanel,
} from '../components';

type BrowserClient = Awaited<ReturnType<typeof buildBrowserClient>>;

function AccepterPage() {
  const demo = DEMOS[useSearchParams().get('demo') === 'loan' ? 'loan' : 'bet'];
  const [client, setClient] = useState<BrowserClient | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [offerHex, setOfferHex] = usePersisted(`${demo.id}-offer-hex`);
  const [acceptHex, setAcceptHex] = usePersisted(`${demo.id}-accept-hex`);
  const [dlcTxsHex, setDlcTxsHex] = usePersisted(`${demo.id}-dlctxs-hex`);
  const [signHex, setSignHex] = usePersisted(`${demo.id}-sign-hex`);
  const [fundTxId, setFundTxId] = usePersisted(`${demo.id}-fund-txid`);
  const [attestationHex, setAttestationHex] = usePersisted(`${demo.id}-attestation-hex`);
  const [cetTxId, setCetTxId] = usePersisted(`${demo.id}-cet-txid`);

  const acceptCollateral = demo.totalCollateral - demo.offerCollateral;

  const refreshWallet = useCallback(async (c: BrowserClient) => {
    setRefreshing(true);
    try {
      setWallet(await getWalletInfo(c));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    buildBrowserClient('accepter')
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

  const accept = run(async () => {
    if (!client || !wallet) throw new Error('wallet not ready');
    if (wallet.balance < Number(acceptCollateral) + 5000)
      throw new Error(
        `Not enough sats: need ~${Number(acceptCollateral) + 5000}, have ${wallet.balance}`,
      );
    const dlcOffer = DlcOffer.deserialize(Buffer.from(offerHex, 'hex'));
    const inputs = await getFundingInputs(wallet);
    const { dlcAccept, dlcTransactions } = await client.dlc.acceptDlcOffer(dlcOffer, inputs);
    setAcceptHex(dlcAccept.serialize().toString('hex'));
    setDlcTxsHex(dlcTransactions.serialize().toString('hex'));
  });

  const finalize = run(async () => {
    if (!client) throw new Error('wallet not ready');
    const dlcOffer = DlcOffer.deserialize(Buffer.from(offerHex, 'hex'));
    const dlcAccept = DlcAccept.deserialize(Buffer.from(acceptHex, 'hex'));
    const dlcSign = DlcSign.deserialize(Buffer.from(signHex, 'hex'));
    const dlcTxs = DlcTransactions.deserialize(Buffer.from(dlcTxsHex, 'hex'));
    const fundTx = await client.dlc.finalizeDlcSign(dlcOffer, dlcAccept, dlcSign, dlcTxs);
    const txid = await client.chain.sendRawTransaction(fundTx.serialize().toString('hex'));
    setFundTxId(String(txid));
  });

  const execute = run(async () => {
    if (!client) throw new Error('wallet not ready');
    const dlcOffer = DlcOffer.deserialize(Buffer.from(offerHex, 'hex'));
    const dlcAccept = DlcAccept.deserialize(Buffer.from(acceptHex, 'hex'));
    const dlcSign = DlcSign.deserialize(Buffer.from(signHex, 'hex'));
    const dlcTxs = DlcTransactions.deserialize(Buffer.from(dlcTxsHex, 'hex'));
    const attestation = OracleAttestation.deserialize(Buffer.from(attestationHex, 'hex'));
    const cet = await client.dlc.execute(dlcOffer, dlcAccept, dlcSign, dlcTxs, attestation, false);
    const txid = await client.chain.sendRawTransaction(cet.serialize().toString('hex'));
    setCetTxId(String(txid));
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">🅑 Accepter — {demo.title}</h1>
        <p className="text-zinc-400 text-sm mt-1">You are the accepter: {demo.accepterRole}.</p>
      </header>

      <Step n={1} title="Fund your wallet" done={(wallet?.balance ?? 0) > 0}>
        <WalletPanel info={wallet} onRefresh={() => client && refreshWallet(client)} refreshing={refreshing} />
      </Step>

      <Step n={2} title="Accept the DLC offer" done={!!acceptHex}>
        <p className="text-sm text-zinc-400">
          Accepting adds your collateral ({acceptCollateral.toLocaleString()} sats) and produces
          your adaptor signatures — pre-signed settlement transactions that only become valid
          when the oracle attests. Copy the accept hex into the Offerer tab.
        </p>
        <HexInput label="DLC offer (from the Offerer tab)" value={offerHex} onChange={setOfferHex} />
        <ActionButton onClick={accept} busy={busy} disabled={!offerHex || !wallet}>
          Accept offer
        </ActionButton>
        <HexOutput label="DLC accept" value={acceptHex} />
        {acceptHex && <VerifyCallout />}
      </Step>

      <Step n={3} title="Finalize and broadcast the funding transaction" done={!!fundTxId}>
        <p className="text-sm text-zinc-400">
          With the offerer&apos;s signatures you can now assemble the funding transaction. Both
          collaterals move into a 2-of-2 multisig that can only be spent by one of the pre-signed
          outcome transactions (or the timelocked refund).
        </p>
        <HexInput label="DLC sign (from the Offerer tab)" value={signHex} onChange={setSignHex} />
        <ActionButton onClick={finalize} busy={busy} disabled={!signHex || !acceptHex}>
          Finalize + broadcast
        </ActionButton>
        <TxLink label="Funding transaction" txid={fundTxId} />
      </Step>

      <Step n={4} title="Execute with the oracle attestation" done={!!cetTxId}>
        <p className="text-sm text-zinc-400">
          The attestation signature decrypts exactly one adaptor signature, turning one pre-signed
          transaction valid. Broadcasting it pays out according to the attested outcome — the
          oracle is never contacted and never touches the funds.
        </p>
        <HexInput
          label="Oracle attestation (from the Oracle tab)"
          value={attestationHex}
          onChange={setAttestationHex}
        />
        <ActionButton onClick={execute} busy={busy} disabled={!attestationHex || !fundTxId}>
          Execute DLC
        </ActionButton>
        <TxLink label="Settlement (CET)" txid={cetTxId} />
      </Step>

      <ErrorBox error={error} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AccepterPage />
    </Suspense>
  );
}
