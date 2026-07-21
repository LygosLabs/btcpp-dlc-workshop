/**
 * Decode any DLC message hex to JSON from the command line.
 *
 * Usage: pnpm exec tsx scripts/decode.ts <hex>
 *        pbpaste | pnpm exec tsx scripts/decode.ts
 */
import {
  DlcAccept,
  DlcOffer,
  DlcSign,
  OracleAnnouncement,
  OracleAttestation,
} from '@node-dlc/messaging';

const DECODERS: [string, { deserialize(buf: Buffer): { toJSON(): unknown } }][] = [
  ['DlcOffer', DlcOffer],
  ['DlcAccept', DlcAccept],
  ['DlcSign', DlcSign],
  ['OracleAnnouncement', OracleAnnouncement],
  ['OracleAttestation', OracleAttestation],
];

async function readInput(): Promise<string> {
  if (process.argv[2]) return process.argv[2].trim();
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

async function main() {
  const hex = await readInput();
  if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('input is not hex');
  const buf = Buffer.from(hex, 'hex');

  for (const [name, cls] of DECODERS) {
    try {
      const json = cls.deserialize(buf).toJSON();
      console.log(`${name} (${buf.length} bytes):`);
      console.log(
        JSON.stringify(json, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
      );
      return;
    } catch {
      // not this type — try the next
    }
  }
  throw new Error('not a recognizable DLC message (tried offer/accept/sign/announcement/attestation)');
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
