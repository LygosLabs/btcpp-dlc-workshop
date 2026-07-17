/**
 * A self-contained DLC oracle for the workshop.
 *
 * Pure JS (works in Node and the browser). The oracle commits to one nonce
 * per event, publishes an announcement, and later attests to the outcome by
 * producing a BIP340 Schnorr signature using that committed nonce.
 */
import {
  EnumEventDescriptor,
  OracleAnnouncement,
  OracleAttestation,
  OracleEvent,
  SingleOracleInfo,
} from '@node-dlc/messaging';
import { schnorr, secp256k1 } from '@noble/curves/secp256k1';
import { math } from 'bip-schnorr';

const G = secp256k1.ProjectivePoint.BASE;
const n = secp256k1.CURVE.n;

const bytesToNum = (b: Uint8Array): bigint => BigInt('0x' + Buffer.from(b).toString('hex'));
const numToBytes = (x: bigint): Buffer => Buffer.from(x.toString(16).padStart(64, '0'), 'hex');

/**
 * BIP340 Schnorr sign a 32-byte message hash with a FIXED nonce.
 * This is the core of a DLC oracle: the nonce (R) was committed to in the
 * announcement, so the attestation signature reveals s = k + H(R||P||m)*d,
 * which lets DLC participants complete their adaptor signatures.
 */
export function schnorrSignWithNonce(msgHash: Buffer, privKey: Buffer, nonce: Buffer): Buffer {
  let d = bytesToNum(privKey) % n;
  const P = G.multiply(d);
  if (P.toAffine().y % 2n === 1n) d = n - d;

  let k = bytesToNum(nonce) % n;
  const R = G.multiply(k);
  if (R.toAffine().y % 2n === 1n) k = n - k;

  const rx = numToBytes(R.toAffine().x);
  const px = numToBytes(P.toAffine().x);
  const e = bytesToNum(schnorr.utils.taggedHash('BIP0340/challenge', Buffer.concat([rx, px, msgHash]))) % n;
  const s = (k + e * d) % n;

  const sig = Buffer.concat([rx, numToBytes(s)]);
  // ponytail: self-check every sig; costs microseconds, catches a broken oracle instantly
  if (!schnorr.verify(sig, msgHash, px)) throw new Error('oracle produced invalid signature');
  return sig;
}

export class WorkshopOracle {
  readonly privKey: Buffer;
  readonly nonce: Buffer;

  constructor(privKeyHex?: string, nonceHex?: string) {
    this.privKey = privKeyHex
      ? Buffer.from(privKeyHex, 'hex')
      : Buffer.from(schnorr.utils.randomPrivateKey());
    this.nonce = nonceHex
      ? Buffer.from(nonceHex, 'hex')
      : Buffer.from(schnorr.utils.randomPrivateKey());
  }

  /** x-only public key (hex) */
  get publicKey(): Buffer {
    return Buffer.from(schnorr.getPublicKey(this.privKey));
  }

  /** x-only committed nonce point R = k*G (hex) */
  get rValue(): Buffer {
    return Buffer.from(schnorr.getPublicKey(this.nonce));
  }

  /**
   * Build a signed announcement for an enum event.
   * The announcement itself is signed with a standard (random-nonce) BIP340
   * signature; only the attestation uses the committed nonce.
   */
  createAnnouncement(eventId: string, outcomes: string[], maturityEpoch: number): OracleAnnouncement {
    const descriptor = new EnumEventDescriptor();
    descriptor.outcomes = outcomes;

    const event = new OracleEvent();
    event.oracleNonces = [this.rValue];
    event.eventMaturityEpoch = maturityEpoch;
    event.eventDescriptor = descriptor;
    event.eventId = eventId;

    const announcement = new OracleAnnouncement();
    const msg = math.taggedHash('DLC/oracle/announcement/v0', event.serialize());
    announcement.announcementSig = Buffer.from(schnorr.sign(msg, this.privKey));
    announcement.oraclePublicKey = this.publicKey;
    announcement.oracleEvent = event;
    return announcement;
  }

  /**
   * Attest to an outcome. DDK expects the signature over
   * taggedHash('DLC/oracle/attestation/v0', <raw outcome utf8>) — NOT sha256(outcome).
   */
  createAttestation(eventId: string, outcome: string): OracleAttestation {
    const msg = math.taggedHash('DLC/oracle/attestation/v0', Buffer.from(outcome, 'utf8'));
    const attestation = new OracleAttestation();
    attestation.eventId = eventId;
    attestation.oraclePublicKey = this.publicKey;
    attestation.signatures = [schnorrSignWithNonce(msg, this.privKey, this.nonce)];
    attestation.outcomes = [outcome];
    return attestation;
  }
}

export function singleOracleInfo(announcement: OracleAnnouncement): SingleOracleInfo {
  const info = new SingleOracleInfo();
  info.announcement = announcement;
  return info;
}
