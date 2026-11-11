/**
 * Unit tests for the password+OTP registration boundary.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * They pin the parts the UI relies on: the `register/start` body and the
 * optional `Accept-Language` header, the pending-id mapping, the
 * `register/complete` body, the error-code → copy mapping, and the fact that a
 * successful completion adopts the session through the same path as login
 * (token stored, `onSession` called) while a failure stores nothing.
 */
import { describe, expect, test } from 'bun:test'

import { createAuthRepository } from '../../src/features/auth/infrastructure/authRepository'
import { toRegisterPending } from '../../src/features/auth/infrastructure/mappers'
import { registerErrorMessageKey } from '../../src/shared/presentation/errors/messages'
import { createTokenStore } from '../../src/shared/infrastructure/session/tokenStore'
import type { ApiClient } from '../../src/shared/infrastructure/api/client'

interface RecordedCall {
  readonly path: string
  readonly init?: { body?: unknown; headers?: Record<string, string> }
}

/** Minimal openapi-fetch call shape `toResult` consumes. */
type FakeCallResult = {
  readonly data?: unknown
  readonly error?: unknown
  readonly response: Response
}

const tokenBody = {
  access_token: 'access-token-value',
  token_type: 'Bearer',
  expires_in: 900,
  tenant: {
    id: '018f0000-0000-7000-8000-000000000001',
    type: 'personal',
    name: 'ALIYEV ALI',
    role: 'owner',
  },
}

const makeRepository = (client: Record<string, unknown>) => {
  const tokens = createTokenStore()
  const sessions: Array<{ token: string | null; expiresIn: number | null }> = []
  const repository = createAuthRepository({
    client: client as unknown as ApiClient,
    tokens,
    refreshRunner: async () => {
      throw new Error('refresh must not be called by these tests')
    },
    onLoggedOut: () => {},
    onLogoutStart: () => {},
    onLogoutFailed: () => {},
    onSession: (token, expiresIn) => {
      sessions.push({ token, expiresIn })
    },
    onSessionChanged: () => {},
    runExclusive: async <R>(run: () => Promise<R>): Promise<R> => run(),
  })
  return { repository, tokens, sessions }
}

const completeInput = {
  pendingId: 'p-1',
  code: '123456',
  password: 'correct horse battery staple',
  fullName: 'ALIYEV ALI',
  otpLocale: 'uz',
}

describe('toRegisterPending', () => {
  test('maps the snake_case start response to the pending model', () => {
    expect(toRegisterPending({ pending_id: 'p-1', expires_in: 300, resend_after: 60 })).toEqual({
      pendingId: 'p-1',
      expiresInSec: 300,
      resendAfterSec: 60,
    })
  })

  test('returns null when the response body is missing', () => {
    expect(toRegisterPending(undefined)).toBeNull()
  })
})

describe('authRepository.registerStart', () => {
  test('POSTs the email and phone with the OTP locale header', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async POST(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return {
          data: { pending_id: 'p-1', expires_in: 300, resend_after: 60 },
          response: new Response(null, { status: 202 }),
        }
      },
    }
    const { repository } = makeRepository(client)

    const result = await repository.registerStart({
      email: 'user@example.uz',
      phone: '998901234567',
      otpLocale: 'uz-Cyrl',
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/v1/identity/register/start')
    expect(calls[0]?.init?.body).toEqual({
      email: 'user@example.uz',
      phone: '998901234567',
    })
    expect(calls[0]?.init?.headers).toEqual({ 'Accept-Language': 'uz-Cyrl' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value).toEqual({ pendingId: 'p-1', expiresInSec: 300, resendAfterSec: 60 })
  })

  test('sends the chosen UI language as language_code when provided', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async POST(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return {
          data: { pending_id: 'p-1', expires_in: 300, resend_after: 60 },
          response: new Response(null, { status: 202 }),
        }
      },
    }
    const { repository } = makeRepository(client)

    await repository.registerStart({
      email: 'user@example.uz',
      phone: '998901234567',
      otpLocale: 'uz-Cyrl',
      languageCode: 'uz-Cyrl',
    })

    // The body gains `language_code`; the OTP header is unchanged.
    expect(calls[0]?.init?.body).toEqual({
      email: 'user@example.uz',
      phone: '998901234567',
      language_code: 'uz-Cyrl',
    })
    expect(calls[0]?.init?.headers).toEqual({ 'Accept-Language': 'uz-Cyrl' })
  })

  test('maps a 409 machine code to its copy key', async () => {
    const client = {
      async POST(): Promise<FakeCallResult> {
        return {
          error: { error: { code: 'identifier_already_registered', message: 'taken' } },
          response: new Response(null, { status: 409 }),
        }
      },
    }
    const { repository } = makeRepository(client)

    const result = await repository.registerStart({
      email: 'user@example.uz',
      phone: '998901234567',
      otpLocale: 'en',
    })

    if (result.ok) throw new Error('expected the 409 to surface as an error')
    expect(registerErrorMessageKey(result.error)).toBe('errors.identifier_already_registered')
  })
})

describe('authRepository.registerComplete', () => {
  test('POSTs the completion body and adopts the session like login', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async POST(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return { data: tokenBody, response: new Response(null, { status: 201 }) }
      },
    }
    const { repository, tokens, sessions } = makeRepository(client)

    const result = await repository.registerComplete(completeInput)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/v1/identity/register/complete')
    expect(calls[0]?.init?.body).toEqual({
      pending_id: 'p-1',
      code: '123456',
      password: 'correct horse battery staple',
      full_name: 'ALIYEV ALI',
    })
    expect(calls[0]?.init?.headers).toEqual({ 'Accept-Language': 'uz' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.kind).toBe('authenticated')
    expect(result.value.principal.type).toBe('PERSON')
    expect(tokens.get()).toBe('access-token-value')
    expect(sessions).toEqual([{ token: 'access-token-value', expiresIn: 900 }])
  })

  test('stores no token when completion fails', async () => {
    const client = {
      async POST(): Promise<FakeCallResult> {
        return {
          error: { error: { code: 'otp_invalid', message: 'bad code' } },
          response: new Response(null, { status: 400 }),
        }
      },
    }
    const { repository, tokens } = makeRepository(client)

    const result = await repository.registerComplete(completeInput)

    if (result.ok) throw new Error('expected the failure to surface as an error')
    expect(registerErrorMessageKey(result.error)).toBe('errors.otp_invalid')
    expect(tokens.get()).toBeNull()
  })
})
