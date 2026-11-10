import { ok } from '@/shared/domain'
import type { Result } from '@/shared/domain'

import type { EimzoKey } from '../../domain/entities'
import type { EimzoAuthAdapter, EimzoSignature } from '../../domain/ports'
import { mockSign, type MockPreset } from './devMockSign'

/**
 * The two fixed identities the backend's mock mode can authenticate. The ids
 * ARE the backend's preset names, so the selected key chooses the preset. The
 * labels are plain dev-only strings — this module is never bundled for
 * production and its copy is never seeded.
 */
const MOCK_KEYS: readonly EimzoKey[] = [
  {
    id: 'personal_mock',
    subject: 'Mock personal key',
    serialNumber: 'personal_mock',
    validFrom: null,
    validTo: null,
  },
  {
    id: 'org_mock',
    subject: 'Mock organization key',
    serialNumber: 'org_mock',
    validFrom: null,
    validTo: null,
  },
]

/**
 * Development-only stand-in for the E-IMZO client. Reachable exclusively when
 * the build is a dev build and `VITE_EIMZO_MOCK === 'true'`, through the gated
 * dynamic import in `createEimzoAdapter`; a production build drops that
 * dynamic import, so this module is never shipped.
 *
 * Instead of performing a real PKCS#7 signature, it asks the backend's mock
 * signer to sign the server challenge as the preset matching the selected key.
 * The preset decides which identity the backend authenticates: `personal_mock`
 * a PERSON, `org_mock` an ORG.
 */
export class MockEimzoAdapter implements EimzoAuthAdapter {
  readonly kind = 'mock' as const

  private readonly apiBaseUrl: string

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl
  }

  listKeys(): Promise<Result<readonly EimzoKey[]>> {
    return Promise.resolve(ok(MOCK_KEYS))
  }

  async sign(challenge: string, key?: EimzoKey): Promise<Result<EimzoSignature>> {
    // An unknown or omitted key falls back to the first listed key
    // (`personal_mock`), mirroring the real adapter's fallback.
    const preset: MockPreset = key?.id === 'org_mock' ? 'org_mock' : 'personal_mock'
    const pkcs7 = await mockSign(this.apiBaseUrl, challenge, preset)
    if (!pkcs7.ok) return pkcs7
    return ok({ challenge, pkcs7: pkcs7.value })
  }
}
