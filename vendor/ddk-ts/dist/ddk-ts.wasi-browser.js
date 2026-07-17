import {
  createOnMessage as __wasmCreateOnMessageForFsProxy,
  getDefaultContext as __emnapiGetDefaultContext,
  instantiateNapiModuleSync as __emnapiInstantiateNapiModuleSync,
  WASI as __WASI,
} from '@napi-rs/wasm-runtime'



const __wasi = new __WASI({
  version: 'preview1',
})

const __wasmUrl = new URL('./ddk-ts.wasm32-wasi.wasm', import.meta.url).href
const __emnapiContext = __emnapiGetDefaultContext()


const __sharedMemory = new WebAssembly.Memory({
  initial: 4000,
  maximum: 65536,
  shared: true,
})

const __wasmFile = await fetch(__wasmUrl).then((res) => res.arrayBuffer())

const {
  instance: __napiInstance,
  module: __wasiModule,
  napiModule: __napiModule,
} = __emnapiInstantiateNapiModuleSync(__wasmFile, {
  context: __emnapiContext,
  asyncWorkPoolSize: 4,
  wasi: __wasi,
  onCreateWorker() {
    const worker = new Worker(new URL('./wasi-worker-browser.mjs', import.meta.url), {
      type: 'module',
    })

    return worker
  },
  overwriteImports(importObject) {
    importObject.env = {
      ...importObject.env,
      ...importObject.napi,
      ...importObject.emnapi,
      memory: __sharedMemory,
    }
    return importObject
  },
  beforeInit({ instance }) {
    for (const name of Object.keys(instance.exports)) {
      if (name.startsWith('__napi_register__')) {
        instance.exports[name]()
      }
    }
  },
})
export default __napiModule.exports
export const addSignatureToTransaction = __napiModule.exports.addSignatureToTransaction
export const convertMnemonicToSeed = __napiModule.exports.convertMnemonicToSeed
export const createCet = __napiModule.exports.createCet
export const createCetAdaptorPointsFromOracleInfo = __napiModule.exports.createCetAdaptorPointsFromOracleInfo
export const createCetAdaptorSignatureFromOracleInfo = __napiModule.exports.createCetAdaptorSignatureFromOracleInfo
export const createCetAdaptorSigsFromOracleInfo = __napiModule.exports.createCetAdaptorSigsFromOracleInfo
export const createCetAdaptorSigsFromPoints = __napiModule.exports.createCetAdaptorSigsFromPoints
export const createCets = __napiModule.exports.createCets
export const createDlcTransactions = __napiModule.exports.createDlcTransactions
export const createExtkeyFromParentPath = __napiModule.exports.createExtkeyFromParentPath
export const createExtkeyFromSeed = __napiModule.exports.createExtkeyFromSeed
export const createFundTxLockingScript = __napiModule.exports.createFundTxLockingScript
export const createRefundTransaction = __napiModule.exports.createRefundTransaction
export const createSplicedDlcTransactions = __napiModule.exports.createSplicedDlcTransactions
export const createXprivFromParentPath = __napiModule.exports.createXprivFromParentPath
export const extractEcdsaSignatureFromOracleSignatures = __napiModule.exports.extractEcdsaSignatureFromOracleSignatures
export const getCetAdaptorSignatureInputs = __napiModule.exports.getCetAdaptorSignatureInputs
export const getCetSighash = __napiModule.exports.getCetSighash
export const getChangeOutputAndFees = __napiModule.exports.getChangeOutputAndFees
export const getPubkeyFromExtkey = __napiModule.exports.getPubkeyFromExtkey
export const getRawFundingTransactionInputSignature = __napiModule.exports.getRawFundingTransactionInputSignature
export const getTotalInputVsize = __napiModule.exports.getTotalInputVsize
export const getXpubFromXpriv = __napiModule.exports.getXpubFromXpriv
export const isDustOutput = __napiModule.exports.isDustOutput
export const signCet = __napiModule.exports.signCet
export const signFundTransactionInput = __napiModule.exports.signFundTransactionInput
export const signMultiSigInput = __napiModule.exports.signMultiSigInput
export const verifyCetAdaptorSigFromOracleInfo = __napiModule.exports.verifyCetAdaptorSigFromOracleInfo
export const verifyCetAdaptorSigsFromOracleInfo = __napiModule.exports.verifyCetAdaptorSigsFromOracleInfo
export const verifyFundTxSignature = __napiModule.exports.verifyFundTxSignature
export const version = __napiModule.exports.version
