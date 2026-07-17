/**
 * Browser-side loader for the ddk-ts wasm module.
 * The package's "browser" entry does the wasm fetch + worker setup via
 * top-level await; we just cache the imported module.
 */
let ddkPromise: Promise<typeof import('@bennyblader/ddk-ts')> | null = null;

export function getDdk() {
  if (!ddkPromise) ddkPromise = import('@bennyblader/ddk-ts');
  return ddkPromise;
}
