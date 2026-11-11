/**
 * Unit tests for the account-language write (`PATCH /api/v1/identity/me`).
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * The settings section persists the interface language through this use case
 * before switching the UI, so these tests pin the path, the
 * `MeLanguageUpdateRequest` body (the contract's only field, required but
 * nullable), the fresh-profile mapping, and the untouched error envelope (the
 * machine `code` must survive for the `system_language_unsupported` copy).
 */
import { describe, expect, test } from 'bun:test'

import { createAuthRepository } from '../../src/features/auth/infrastructure/authRepository'
import { createTokenStore } from '../../src/shared/infrastructure/session/tokenStore'
import type { ApiClient } from '../../src/shared/infrastructure/api/client'

interface RecordedCall {
  readonly path: string
  readonly init?: { body?: unknown }
}

/** Minimal openapi-fetch call shape `toResult` consumes. */
type FakeCallResult = {
  readonly data?: unknown
  readonly error?: unknown
  readonly response: Response
}

const makeRepository = (client: Record<string, unknown>) =>
  createAuthRepository({
    client: client as unknown as ApiClient,
    tokens: createTokenStore(),
    refreshRunner: async () => {
      throw new Error('refresh must not be called by these tests')
    },
    onLoggedOut: () => {},
    onLogoutStart: () => {},
    onLogoutFailed: () => {},
    onSession: () => {},
    onSessionChanged: () => {},
    runExclusive: async <R>(run: () => Promise<R>): Promise<R> => run(),
  })

const meBody = {
  id: '018f0000-0000-7000-8000-000000000001',
  full_name: 'ALIYEV ALI',
  email_masked: 'a***@example.uz',
  phone_masked: '+998 90 *** 45 67',
  has_password: true,
  language_code: 'uz-Cyrl',
}

describe('authRepository.updateLanguage', () => {
  test('PATCHes the language and maps the fresh profile', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async PATCH(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return { data: meBody, response: new Response(null, { status: 200 }) }
      },
    }
    const repository = makeRepository(client)

    const result = await repository.updateLanguage('uz-Cyrl')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/v1/identity/me')
    expect(calls[0]?.init?.body).toEqual({ language_code: 'uz-Cyrl' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.languageCode).toBe('uz-Cyrl')
    expect(result.value.uuid).toBe(meBody.id)
  })

  test('surfaces the error envelope untouched, machine code included', async () => {
    const client = {
      async PATCH(): Promise<FakeCallResult> {
        return {
          error: { error: { code: 'validation_error', message: 'developer-facing text' } },
          response: new Response(null, { status: 422 }),
        }
      },
    }
    const repository = makeRepository(client)

    // The client rejects regardless of input (the backend validates the code,
    // not this client), so a supported code still exercises the 422 path.
    const result = await repository.updateLanguage('uz-Cyrl')

    if (result.ok) throw new Error('expected the 422 to surface as an error')
    expect(result.error.kind).toBe('Unprocessable')
    expect(result.error).toMatchObject({ code: 'validation_error' })
  })
})
