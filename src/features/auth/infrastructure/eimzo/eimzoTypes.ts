/**
 * Minimal typings for the vendored E-IMZO browser client
 * (`public/e-imzo/e-imzo-client.js`). Only the members the adapter uses are
 * declared; the script attaches `EIMZOClient` to `window` when it loads.
 */

/** The key object the E-IMZO client builds for a PFX key and passes back to us. */
export interface EimzoRawKey {
  readonly type: string
  readonly disk?: string
  readonly path?: string
  readonly name?: string
  readonly alias?: string
  readonly cardUID?: string
  readonly serialNumber: string
  readonly validFrom: Date
  readonly validTo: Date
  readonly CN: string
  readonly TIN: string
  readonly UID: string
  readonly PINFL: string
  readonly O: string
  readonly T: string
}

export interface EimzoClientGlobal {
  API_KEYS: string[]
  checkVersion(
    success: (major: string, minor: string) => void,
    fail: (error: unknown, reason: string | null) => void,
  ): void
  installApiKeys(success: () => void, fail: (error: unknown, reason: string | null) => void): void
  listAllUserKeys<TItem>(
    itemIdGen: (vo: EimzoRawKey, rec: string) => string,
    itemUiGen: (id: string, vo: EimzoRawKey) => TItem,
    success: (items: TItem[], firstId: string | null) => void,
    fail: (error: unknown, reason: string | null) => void,
  ): void
  loadKey(
    itemObject: EimzoRawKey,
    success: (keyId: string) => void,
    fail: (error: unknown, reason: string | null) => void,
    verifyPassword?: boolean,
  ): void
  createPkcs7(
    id: string,
    data: string,
    timestamper: unknown,
    success: (pkcs7: string) => void,
    fail: (error: unknown, reason: string | null) => void,
    detached?: boolean,
    isDataBase64Encoded?: boolean,
  ): void
}

declare global {
  interface Window {
    EIMZOClient?: EimzoClientGlobal
  }
}
