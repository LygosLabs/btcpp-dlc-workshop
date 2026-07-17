declare module 'bip-schnorr' {
  export const math: {
    taggedHash(tag: string, msg: Buffer | string): Buffer;
  };
}
