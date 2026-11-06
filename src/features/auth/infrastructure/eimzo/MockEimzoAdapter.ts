import { ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'

import type { EimzoKey } from '../../domain/entities'
import type { EimzoAuthAdapter, EimzoSignature } from '../../domain/ports'

const MOCK_KEY: EimzoKey = {
  id: 'mock-eimzo-key',
  subject: 'MOCK TEST KEY',
  serialNumber: '000000000000000000',
  validFrom: null,
  validTo: null,
}

/**
 * Development-only stand-in for the E-IMZO client. Reachable exclusively when
 * the build is a dev build and `VITE_EIMZO_MOCK === 'true'`; a production build
 * drops the dynamic import that loads this module, so it is never shipped.
 *
 * It reports one fixed key and returns the configured PKCS#7 blob, which lets
 * the E-IMZO login panel be exercised without the desktop app installed.
 */
export class MockEimzoAdapter implements EimzoAuthAdapter {
  readonly kind = 'mock' as const

  private readonly pkcs7: string

  constructor(pkcs7: string) {
    this.pkcs7 = pkcs7
  }

  listKeys(): Promise<Result<readonly EimzoKey[]>> {
    return Promise.resolve(ok([MOCK_KEY]))
  }

  sign(challenge: string, _key?: EimzoKey): Promise<Result<EimzoSignature>> {
    return Promise.resolve(ok({ challenge, pkcs7: this.pkcs7 }))
  }
}
