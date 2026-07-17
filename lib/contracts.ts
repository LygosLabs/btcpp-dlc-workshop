/**
 * Contract definitions for the two workshop demos.
 * Both are enum DLCs: a handful of outcomes, one adaptor signature each.
 */
import {
  EnumeratedDescriptor,
  OracleAnnouncement,
  SingleContractInfo,
} from '@node-dlc/messaging';

import { singleOracleInfo } from './oracle';

export interface EnumPayout {
  outcome: string;
  /** payout to the offerer; accepter gets totalCollateral - localPayout */
  localPayout: bigint;
}

export function buildEnumContractInfo(
  announcement: OracleAnnouncement,
  payouts: EnumPayout[],
  totalCollateral: bigint,
): SingleContractInfo {
  const descriptor = new EnumeratedDescriptor();
  descriptor.outcomes = payouts.map((p) => ({
    outcome: p.outcome,
    localPayout: p.localPayout,
  }));

  const contractInfo = new SingleContractInfo();
  contractInfo.totalCollateral = totalCollateral;
  contractInfo.contractDescriptor = descriptor;
  contractInfo.oracleInfo = singleOracleInfo(announcement);
  return contractInfo;
}

/**
 * Demo 1 — Betting on the 2026 World Cup final, Spain vs Argentina.
 * Even-money, winner takes all. Offerer backs Spain, accepter backs Argentina.
 */
export const BET_EVENT = {
  eventId: 'wc2026-final',
  outcomes: ['spain', 'argentina', 'other'],
  title: 'FIFA World Cup 2026 Final: Spain vs Argentina',
};

export function betPayouts(totalCollateral: bigint): EnumPayout[] {
  return [
    { outcome: 'spain', localPayout: totalCollateral },
    { outcome: 'argentina', localPayout: 0n },
    // draw/abandonment can't stand in a final; treat as push -> refund both sides
    { outcome: 'other', localPayout: totalCollateral / 2n },
  ];
}

/**
 * Demo 2 — A Lygos-style BTC-collateralized loan.
 * Four enumerated outcomes (see "DLCs are perfect for Lending").
 * Offerer = borrower (posts the BTC collateral), accepter = lender.
 */
export const LOAN_EVENT = {
  eventId: 'loan-demo',
  outcomes: ['not-funded', 'repaid', 'liquidated-by-price', 'liquidated-by-maturity'],
  title: 'BTC-Collateralized Loan (4 enumerated outcomes)',
};

export function loanPayouts(borrowerCollateral: bigint): EnumPayout[] {
  return [
    { outcome: 'not-funded', localPayout: borrowerCollateral },
    { outcome: 'repaid', localPayout: borrowerCollateral },
    { outcome: 'liquidated-by-price', localPayout: 0n },
    { outcome: 'liquidated-by-maturity', localPayout: 0n },
  ];
}

/** Everything the UI needs to run one demo. */
export interface DemoConfig {
  id: 'bet' | 'loan';
  eventId: string;
  title: string;
  outcomes: string[];
  totalCollateral: bigint;
  offerCollateral: bigint;
  payouts: EnumPayout[];
  offererRole: string;
  accepterRole: string;
  outcomeLabels: Record<string, string>;
}

const BET_TOTAL = 100_000n;
const LOAN_BORROWER = 100_000n;
const LOAN_LENDER = 10_000n;

export const DEMOS: Record<'bet' | 'loan', DemoConfig> = {
  bet: {
    id: 'bet',
    eventId: BET_EVENT.eventId,
    title: BET_EVENT.title,
    outcomes: BET_EVENT.outcomes,
    totalCollateral: BET_TOTAL,
    offerCollateral: BET_TOTAL / 2n,
    payouts: betPayouts(BET_TOTAL),
    offererRole: 'backs Spain (50k sats)',
    accepterRole: 'backs Argentina (50k sats)',
    outcomeLabels: {
      spain: 'Spain wins → offerer takes all',
      argentina: 'Argentina wins → accepter takes all',
      other: 'No result → both refunded',
    },
  },
  loan: {
    id: 'loan',
    eventId: LOAN_EVENT.eventId,
    title: LOAN_EVENT.title,
    outcomes: LOAN_EVENT.outcomes,
    totalCollateral: LOAN_BORROWER + LOAN_LENDER,
    offerCollateral: LOAN_BORROWER,
    payouts: loanPayouts(LOAN_BORROWER),
    offererRole: 'borrower — posts 100k sats BTC collateral',
    accepterRole: 'lender — posts a 10k sats stake (stands in for the fiat loan)',
    outcomeLabels: {
      'not-funded': 'Loan never funded → collateral returns to borrower',
      repaid: 'Loan repaid → collateral returns to borrower',
      'liquidated-by-price': 'Price hit liquidation → collateral to lender',
      'liquidated-by-maturity': 'Matured unpaid → collateral to lender',
    },
  },
};
