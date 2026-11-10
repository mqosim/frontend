/**
 * Unit tests for the E-IMZO entry points of the auth repository.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * They pin the orchestration the panels rely on: exactly one fresh challenge
 * per attempt, the `{pkcs7}` request bodies, session adoption through the same
 * `finish()` path as password login, and the fact that linking never touches
 * the local token state.
 */
import { describe, expect, test } from 'bun:test'

import { createAuthRepository } from '../../src/features/auth/infrastructure/authRepository'
import type { ApiClient } from '../../src/shared/infrastructure/api/client'
import type { EimzoAuthAdapter, EimzoSignature } from '../../src/features/auth/domain/ports'
import type { EimzoKey } from '../../src/features/auth/domain/entities'
import { createTokenStore } from '../../src/shared/infrastructure/session/tokenStore'
import { err, ok } from '../../src/shared/domain'
import type { Result } from '../../src/shared/domain'

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

const PERSONAL_KEY: EimzoKey = {
  id: 'key-1',
  subject: 'TEST KEY',
  serialNumber: '0001',
  validFrom: null,
  validTo: null,
}

/** A controllable stand-in for the E-IMZO signing adapter. */
const makeAdapter = () => {
  const calls: Array<{ challenge: string; keyId?: string }> = []
  let next: Result<EimzoSignature> = ok({ challenge: 'c-1', pkcs7: 'pkcs7-value' })
  const adapter: EimzoAuthAdapter = {
    kind: 'mock',
    listKeys: () => Promise.resolve(ok([PERSONAL_KEY])),
    sign: (challenge, key) => {
      calls.push({ challenge, keyId: key?.id })
      return Promise.resolve(next)
    },
  }
  return {
    adapter,
    calls,
    fail: () => {
      next = err({ kind: 'Eimzo', code: 'failed' })
    },
  }
}

const makeRepository = (client: Record<string, unknown>, adapter: EimzoAuthAdapter) => {
  const tokens = createTokenStore()
  const sessions: Array<{ token: string | null; expiresIn: number | null }> = []
  const repository = createAuthRepository({
    client: client as unknown as ApiClient,
    tokens,
    eimzo: adapter,
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

describe('authRepository.loginWithEimzo', () => {
  test('signs one fresh challenge and adopts the session like password login', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async GET(path: string): Promise<FakeCallResult> {
        calls.push({ path })
        return {
          data: { challenge: 'challenge-value', expires_in: 120 },
          response: new Response(null, { status: 200 }),
        }
      },
      async POST(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return { data: tokenBody, response: new Response(null, { status: 200 }) }
      },
    }
    const eimzo = makeAdapter()
    const { repository, tokens, sessions } = makeRepository(client, eimzo.adapter)

    const result = await repository.loginWithEimzo(PERSONAL_KEY)

    // Exactly one challenge and one login per attempt, with the signed pkcs7.
    expect(calls.map((call) => call.path)).toEqual([
      '/api/v1/identity/eimzo/challenge',
      '/api/v1/identity/eimzo/login',
    ])
    expect(eimzo.calls).toEqual([{ challenge: 'challenge-value', keyId: 'key-1' }])
    expect(calls[1]?.init?.body).toEqual({ pkcs7: 'pkcs7-value' })
    // The login response sets both cookies and carries the token: full adoption.
    expect(tokens.get()).toBe('access-token-value')
    expect(sessions).toEqual([{ token: 'access-token-value', expiresIn: 900 }])
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.kind).toBe('authenticated')
  })

  test('stores no token when the login is rejected', async () => {
    const client = {
      async GET(): Promise<FakeCallResult> {
        return {
          data: { challenge: 'challenge-value', expires_in: 120 },
          response: new Response(null, { status: 200 }),
        }
      },
      async POST(): Promise<FakeCallResult> {
        return {
          error: { error: { code: 'eimzo_certificate_revoked', message: 'revoked' } },
          response: new Response(null, { status: 401 }),
        }
      },
    }
    const eimzo = makeAdapter()
    const { repository, tokens, sessions } = makeRepository(client, eimzo.adapter)

    const result = await repository.loginWithEimzo(PERSONAL_KEY)

    if (result.ok) throw new Error('expected the 401 to surface as an error')
    expect(result.error.kind).toBe('Unauthorized')
    expect(tokens.get()).toBeNull()
    expect(sessions).toEqual([])
  })

  test('does not call the API when the adapter fails', async () => {
    const posts: string[] = []
    const client = {
      async GET(): Promise<FakeCallResult> {
        return {
          data: { challenge: 'challenge-value', expires_in: 120 },
          response: new Response(null, { status: 200 }),
        }
      },
      async POST(path: string): Promise<FakeCallResult> {
        posts.push(path)
        return { response: new Response(null, { status: 200 }) }
      },
    }
    const eimzo = makeAdapter()
    eimzo.fail()
    const { repository, tokens } = makeRepository(client, eimzo.adapter)

    const result = await repository.loginWithEimzo(PERSONAL_KEY)

    if (result.ok) throw new Error('expected the adapter failure to surface')
    expect(result.error).toEqual({ kind: 'Eimzo', code: 'failed' })
    expect(posts).toEqual([])
    expect(tokens.get()).toBeNull()
  })
})

describe('authRepository.linkEimzo', () => {
  test('signs one fresh challenge and maps the masked PINFL without touching tokens', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async GET(path: string): Promise<FakeCallResult> {
        calls.push({ path })
        return {
          data: { challenge: 'challenge-value', expires_in: 120 },
          response: new Response(null, { status: 200 }),
        }
      },
      async POST(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return {
          data: { linked: true, pinfl_masked: '123*******4567' },
          response: new Response(null, { status: 200 }),
        }
      },
    }
    const eimzo = makeAdapter()
    const { repository, tokens, sessions } = makeRepository(client, eimzo.adapter)

    const result = await repository.linkEimzo(PERSONAL_KEY)

    expect(calls.map((call) => call.path)).toEqual([
      '/api/v1/identity/eimzo/challenge',
      '/api/v1/identity/eimzo/link',
    ])
    expect(calls[1]?.init?.body).toEqual({ pkcs7: 'pkcs7-value' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value).toEqual({ linked: true, pinflMasked: '123*******4567' })
    // Linking is a bearer call: it never sets, stores or clears the token.
    expect(tokens.get()).toBeNull()
    expect(sessions).toEqual([])
  })

  test('surfaces a link rejection without a local token change', async () => {
    const client = {
      async GET(): Promise<FakeCallResult> {
        return {
          data: { challenge: 'challenge-value', expires_in: 120 },
          response: new Response(null, { status: 200 }),
        }
      },
      async POST(): Promise<FakeCallResult> {
        return {
          error: { error: { code: 'eimzo_error', message: 'backend failed' } },
          response: new Response(null, { status: 502 }),
        }
      },
    }
    const eimzo = makeAdapter()
    const { repository, tokens } = makeRepository(client, eimzo.adapter)

    const result = await repository.linkEimzo(PERSONAL_KEY)

    if (result.ok) throw new Error('expected the 502 to surface as an error')
    // The code-first copy mapping relies on the code surviving the 502.
    expect(result.error).toEqual({ kind: 'Unknown', status: 502, code: 'eimzo_error' })
    expect(tokens.get()).toBeNull()
  })
})
