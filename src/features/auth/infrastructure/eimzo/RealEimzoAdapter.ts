import { err, ok } from '@/shared/domain'
import type { AppError, EimzoFailureCode, Result } from '@/shared/domain'

import type { EimzoKey } from '../../domain/entities'
import type { EimzoAuthAdapter, EimzoSignature } from '../../domain/ports'
import { EIMZO_API_KEYS, toApiKeyList } from './apiKeys'
import type { EimzoClientGlobal, EimzoRawKey } from './eimzoTypes'
import { loadEimzoClient } from './loadEimzoClient'

export interface RealEimzoAdapterConfig {
  /** App base URL (Vite `base`) used to resolve the vendored scripts. */
  readonly baseUrl: string
  /** Optional override of the domain → API-KEY map. */
  readonly apiKeys?: Readonly<Record<string, string>>
}

interface ListedKey {
  readonly id: string
  readonly key: EimzoRawKey
}

const failure = (code: EimzoFailureCode): AppError => ({ kind: 'Eimzo', code })

const toIsoOrNull = (date: Date): string | null =>
  Number.isNaN(date.getTime()) ? null : date.toISOString()

const toEimzoKey = (raw: EimzoRawKey, id: string): EimzoKey => ({
  id,
  subject: raw.CN.length > 0 ? raw.CN : raw.serialNumber,
  serialNumber: raw.serialNumber,
  validFrom: toIsoOrNull(raw.validFrom),
  validTo: toIsoOrNull(raw.validTo),
})

/**
 * Real E-IMZO integration. It loads the vendored client, performs the
 * documented handshake (`checkVersion` → `installApiKeys`) and then lists,
 * loads and signs with keys through the local E-IMZO desktop app.
 *
 * The handshake is re-run on every call so the panel's "refresh" retries after
 * the user starts E-IMZO; only the loaded script is cached.
 */
export class RealEimzoAdapter implements EimzoAuthAdapter {
  readonly kind = 'real' as const

  private readonly baseUrl: string
  private readonly apiKeys: Readonly<Record<string, string>>
  private readonly keys = new Map<string, EimzoRawKey>()

  constructor(config: RealEimzoAdapterConfig) {
    this.baseUrl = config.baseUrl
    this.apiKeys = config.apiKeys ?? EIMZO_API_KEYS
  }

  async listKeys(): Promise<Result<readonly EimzoKey[]>> {
    const client = await this.ensureReady()
    if (!client.ok) return client

    const listed = await this.listAll(client.value)
    if (!listed.ok) return listed

    this.keys.clear()
    for (const item of listed.value) this.keys.set(item.id, item.key)
    return ok(listed.value.map((item) => toEimzoKey(item.key, item.id)))
  }

  async sign(challenge: string, key?: EimzoKey): Promise<Result<EimzoSignature>> {
    const client = await this.ensureReady()
    if (!client.ok) return client

    const raw = await this.resolveKey(key)
    if (!raw.ok) return raw

    const keyId = await this.loadKey(client.value, raw.value)
    if (!keyId.ok) return keyId

    const pkcs7 = await this.createPkcs7(client.value, keyId.value, challenge)
    if (!pkcs7.ok) return pkcs7

    return ok({ challenge, pkcs7: pkcs7.value })
  }

  private async ensureReady(): Promise<Result<EimzoClientGlobal>> {
    let client: EimzoClientGlobal
    try {
      client = await loadEimzoClient(this.baseUrl)
    } catch {
      return err(failure('client_unavailable'))
    }

    client.API_KEYS = toApiKeyList(this.apiKeys)

    const version = await new Promise<Result<void>>((resolve) => {
      client.checkVersion(
        () => resolve(ok(undefined)),
        (_error, reason) => resolve(err(failure(this.mapFailure(reason)))),
      )
    })
    if (!version.ok) return version

    const installed = await new Promise<Result<void>>((resolve) => {
      client.installApiKeys(
        () => resolve(ok(undefined)),
        (_error, reason) =>
          resolve(
            // A failed install for a domain we hold no key for is the common
            // cause; report it distinctly so the message can name it.
            err(
              failure(
                this.apiKeys[window.location.hostname] === undefined
                  ? 'api_key_missing'
                  : this.mapFailure(reason),
              ),
            ),
          ),
      )
    })
    if (!installed.ok) return installed

    return ok(client)
  }

  private listAll(client: EimzoClientGlobal): Promise<Result<readonly ListedKey[]>> {
    return new Promise((resolve) => {
      client.listAllUserKeys<ListedKey>(
        (_vo, rec) => `eimzo-${rec}`,
        (id, vo) => ({ id, key: vo }),
        (items) => resolve(ok(items)),
        (_error, reason) => resolve(err(failure(this.mapFailure(reason)))),
      )
    })
  }

  private async resolveKey(key?: EimzoKey): Promise<Result<EimzoRawKey>> {
    if (key !== undefined) {
      const selected = this.keys.get(key.id)
      if (selected !== undefined) return ok(selected)
    }
    if (this.keys.size === 0) {
      // Fallback when the selected key is not in the map: populate it first.
      const listed = await this.listKeys()
      if (!listed.ok) return listed
    }
    for (const raw of this.keys.values()) return ok(raw)
    return err(failure('no_keys'))
  }

  private loadKey(client: EimzoClientGlobal, raw: EimzoRawKey): Promise<Result<string>> {
    return new Promise((resolve) => {
      client.loadKey(
        raw,
        (keyId) => resolve(ok(keyId)),
        (_error, reason) => resolve(err(failure(this.mapFailure(reason)))),
        // `create_pkcs7` shows E-IMZO's own PIN/password prompt; a separate
        // verify step would only shorten the 6-hour remember window.
        false,
      )
    })
  }

  private createPkcs7(
    client: EimzoClientGlobal,
    keyId: string,
    challenge: string,
  ): Promise<Result<string>> {
    return new Promise((resolve) => {
      client.createPkcs7(
        keyId,
        challenge,
        null,
        (pkcs7) => resolve(ok(pkcs7)),
        (_error, reason) => resolve(err(failure(this.mapFailure(reason)))),
        false, // attached PKCS#7 (embeds the signed data), not detached
        false, // `challenge` is plain text; the client Base64-encodes it
      )
    })
  }

  private mapFailure(reason: string | null): EimzoFailureCode {
    if (reason !== null && reason.length > 0) {
      if (/BadPaddingException|wrong password/i.test(reason)) return 'wrong_password'
      if (/cancel|отмен/i.test(reason)) return 'cancelled'
      if (/api[- ]?key|domain/i.test(reason)) return 'api_key_missing'
      return 'failed'
    }
    // No server-provided reason means the WebSocket bridge was unreachable.
    return 'client_unavailable'
  }
}
