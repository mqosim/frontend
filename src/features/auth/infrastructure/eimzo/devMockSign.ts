import { err, ok } from '@/shared/domain'
import type { AppError, Result } from '@/shared/domain'

/**
 * Development-only bridge to the backend's mock E-IMZO signer.
 * `POST /api/v1/identity/eimzo/mock/sign` is documented in the contract notes
 * but deliberately absent from the OpenAPI schema, so the centralized
 * openapi-fetch client cannot type it. This module is therefore the one
 * approved raw-`fetch` exception, and it is reachable exclusively through the
 * `import.meta.env.DEV && VITE_EIMZO_MOCK === 'true'` branch in
 * `createEimzoAdapter`: in a production build that branch is eliminated, the
 * dynamic import below is dropped, and this module is never bundled.
 *
 * The mock is only active while the backend runs with `EIMZO_MODE=mock`
 * (`APP_ENV` dev/test); the returned `pkcs7` is an unsigned mock payload, NOT a
 * PKCS#7/CMS signature, and is accepted only by `/identity/eimzo/login` and
 * `/identity/eimzo/link` while mock mode is active — never by the document
 * endpoints.
 */

/** The two identities the backend's mock mode can authenticate. */
export type MockPreset = 'personal_mock' | 'org_mock'

type MockSignResponse = { readonly pkcs7: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isMockSignResponse = (value: unknown): value is MockSignResponse =>
  isRecord(value) && typeof value['pkcs7'] === 'string'

const mockFailure = (): AppError => ({ kind: 'Eimzo', code: 'failed' })

/**
 * Asks the backend's mock signer to sign `challenge` as `preset`. The response
 * body is validated structurally; no part of it is logged.
 */
export const mockSign = async (
  apiBaseUrl: string,
  challenge: string,
  preset: MockPreset,
): Promise<Result<string>> => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/identity/eimzo/mock/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge, preset }),
    })
    if (!response.ok) return err(mockFailure())
    const body: unknown = await response.json()
    if (!isMockSignResponse(body)) return err(mockFailure())
    return ok(body.pkcs7)
  } catch {
    return err(mockFailure())
  }
}
