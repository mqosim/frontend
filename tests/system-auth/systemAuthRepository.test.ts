/**
 * Unit tests for the SYSTEM auth repository's language persistence.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * The `--tsconfig-override` flag is required because the `@/` path alias is
 * declared in `tsconfig.app.json`, which bun does not read by default. The
 * files live outside `src/` so `vue-tsc -p tsconfig.app.json` never
 * type-checks the `bun:test` imports.
 *
 * The SYSTEM settings page must persist the chosen language through
 * PUT /api/v1/system/users/me BEFORE switching the locale — otherwise the
 * router guard re-adopts the stale account language at the next sign-in.
 * These tests pin the endpoint paths, the payload and the result mapping so
 * the call cannot silently drift back to the no-op it once was.
 */
import { describe, expect, test } from 'bun:test'

import { createSystemAuthRepository } from '../../src/features/system-auth/infrastructure/systemAuthRepository'
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

const systemMeBody = {
  uuid: '018f0000-0000-7000-8000-000000000001',
  user_type: 'SYSTEM',
  email: 'admin@example.com',
  phone_number: null,
  language_code: 'ru',
  email_verified_at: null,
}

const makeRepository = (client: Record<string, unknown>) =>
  createSystemAuthRepository({
    client: client as unknown as ApiClient,
    tokens: createTokenStore(),
    refreshRunner: async () => {
      throw new Error('refresh must not be called by these tests')
    },
    onLoggedOut: () => {},
    onLogoutStart: () => {},
    onLogoutFailed: () => {},
    onSession: () => {},
  })

describe('systemAuthRepository.updateLanguage', () => {
  test('PUTs the SYSTEM-gated me endpoint and maps the refreshed profile', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async PUT(path: string, init?: { body?: unknown }): Promise<FakeCallResult> {
        calls.push({ path, init })
        return { data: systemMeBody, response: new Response(null, { status: 200 }) }
      },
    }

    const result = await makeRepository(client).updateLanguage('ru')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/v1/system/users/me')
    expect(calls[0]?.init?.body).toEqual({ language_code: 'ru' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.languageCode).toBe('ru')
    expect(result.value.uuid).toBe(systemMeBody.uuid)
    expect(result.value.email).toBe(systemMeBody.email)
  })

  test('surfaces failures instead of pretending the language was saved', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async PUT(path: string, init?: { body?: unknown }): Promise<FakeCallResult> {
        calls.push({ path, init })
        return { error: {}, response: new Response(null, { status: 400 }) }
      },
    }

    const result = await makeRepository(client).updateLanguage('ru')

    expect(calls[0]?.path).toBe('/api/v1/system/users/me')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected the 400 to surface as an error')
    expect(result.error).toEqual({ kind: 'Validation', status: 400, fields: {} })
  })
})

describe('systemAuthRepository.getProfile', () => {
  test('reads the SYSTEM-gated me endpoint (the sign-in guard adopts its language)', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async GET(path: string): Promise<FakeCallResult> {
        calls.push({ path })
        return { data: systemMeBody, response: new Response(null, { status: 200 }) }
      },
    }

    const result = await makeRepository(client).getProfile()

    expect(calls[0]?.path).toBe('/api/v1/system/auth/me')
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.languageCode).toBe('ru')
  })
})
