/**
 * Unit tests for the SYSTEM auth repository's two-step sign-in.
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
 * Two properties matter most here:
 *
 * 1. The pre-authentication token from `POST /system/auth/login` never leaves
 *    the repository. It is not returned to the caller, never enters the bearer
 *    token store, and only travels in `X-System-Pre-Auth`.
 * 2. The pending token's lifetime is exactly the contract's: kept for a wrong
 *    code (so the user can retry), dropped when the backend reports it spent,
 *    on local expiry, on logout and when a new login starts.
 */
import { describe, expect, test } from 'bun:test'

import type { SystemSession } from '../../src/features/system-auth/domain/entities'
import {
  createSystemAuthRepository,
} from '../../src/features/system-auth/infrastructure/systemAuthRepository'
import { ok } from '../../src/shared/domain/result'
import type { ApiClient } from '../../src/shared/infrastructure/api/client'
import { createTokenStore } from '../../src/shared/infrastructure/session/tokenStore'

interface RecordedCall {
  readonly path: string
  readonly init?: {
    readonly body?: unknown
    readonly headers?: Record<string, string>
  }
}

/** Minimal openapi-fetch call shape `toResult` consumes. */
type FakeCallResult = {
  readonly data?: unknown
  readonly error?: unknown
  readonly response: Response
}

const jsonOk = (data: unknown): FakeCallResult => ({
  data,
  response: new Response(null, { status: 200 }),
})

/** An error envelope: `message` is developer-facing and must never be surfaced. */
const apiError = (status: number, code: string): FakeCallResult => ({
  error: { error: { code, message: 'developer-facing text' } },
  response: new Response(null, { status }),
})

/** Base64url-encodes one JWT segment. */
const segment = (value: unknown): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const jwt = (payload: unknown): string => `${segment({ alg: 'none' })}.${segment(payload)}.sig`

const systemAccessToken = (): string =>
  jwt({ sub: 'sys-1', exp: 1_700_000_000, aud: 'system', role: 'superadmin' })

const SYSTEM_PRINCIPAL = {
  type: 'SYSTEM',
  userId: 'sys-1',
  orgId: null,
  expiresAt: 1_700_000_000_000,
} as const

const preAuthBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  pre_auth_token: 'pre-auth-1',
  expires_in: 300,
  totp_enrolled: true,
  ...overrides,
})

interface Harness {
  readonly repository: ReturnType<typeof createSystemAuthRepository>
  readonly tokens: ReturnType<typeof createTokenStore>
  readonly calls: RecordedCall[]
  readonly events: string[]
  readonly sessions: (string | null)[]
  readonly refreshCalls: () => number
  setRespond: (respond: (call: RecordedCall) => FakeCallResult) => void
}

/**
 * Builds the repository with in-memory doubles. The response can be swapped
 * between calls so one test can drive a whole multi-step flow.
 */
const makeHarness = (): Harness => {
  const calls: RecordedCall[] = []
  const events: string[] = []
  const sessions: (string | null)[] = []
  const tokens = createTokenStore()
  let refreshCalls = 0
  let respond: (call: RecordedCall) => FakeCallResult = () => {
    throw new Error('unexpected request')
  }

  const record = (path: string, init?: RecordedCall['init']): FakeCallResult => {
    const call = { path, init }
    calls.push(call)
    return respond(call)
  }

  const client = {
    async GET(path: string): Promise<FakeCallResult> {
      return record(path)
    },
    async POST(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
      return record(path, init)
    },
    async PATCH(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
      return record(path, init)
    },
  }

  const repository = createSystemAuthRepository({
    client: client as unknown as ApiClient,
    tokens,
    refreshRunner: async () => {
      refreshCalls += 1
      return ok<SystemSession>({ principal: SYSTEM_PRINCIPAL })
    },
    onLoggedOut: () => events.push('logged-out'),
    onLogoutStart: () => events.push('logout-start'),
    onLogoutFailed: () => events.push('logout-failed'),
    onSession: (accessToken) => sessions.push(accessToken),
  })

  return {
    repository,
    tokens,
    calls,
    events,
    sessions,
    refreshCalls: () => refreshCalls,
    setRespond: (next) => {
      respond = next
    },
  }
}

describe('systemAuthRepository.beginLogin', () => {
  test('verifies the password and reports only the enrollment flag', async () => {
    const harness = makeHarness()
    harness.setRespond(() => jsonOk(preAuthBody()))

    const result = await harness.repository.beginLogin({
      email: 'admin@example.com',
      password: 'secret',
    })

    expect(harness.calls).toHaveLength(1)
    expect(harness.calls[0]?.path).toBe('/api/v1/system/auth/login')
    expect(harness.calls[0]?.init?.body).toEqual({
      email: 'admin@example.com',
      password: 'secret',
    })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value).toEqual({ totpEnrolled: true })
    // The pre-authentication token is structurally unreachable from the caller.
    expect(Object.keys(result.value)).toEqual(['totpEnrolled'])
    expect(JSON.stringify(result)).not.toContain('pre-auth-1')
    // And it is not a bearer token: the store stays empty.
    expect(harness.tokens.get()).toBeNull()
    expect(harness.sessions).toEqual([])
  })

  test('reports a first login as not enrolled', async () => {
    const harness = makeHarness()
    harness.setRespond(() => jsonOk(preAuthBody({ totp_enrolled: false })))

    const result = await harness.repository.beginLogin({
      email: 'admin@example.com',
      password: 'secret',
    })

    if (!result.ok) throw new Error('expected ok')
    expect(result.value.totpEnrolled).toBe(false)
  })

  test('surfaces a locked account by its machine code (a 423 is not a known kind)', async () => {
    const harness = makeHarness()
    harness.setRespond(() => apiError(423, 'system_account_locked'))

    const result = await harness.repository.beginLogin({
      email: 'admin@example.com',
      password: 'secret',
    })

    if (result.ok) throw new Error('expected the 423 to surface as an error')
    // The copy is chosen from `code`, never from the backend's `message`.
    expect(result.error).toEqual({ kind: 'Unknown', status: 423, code: 'system_account_locked' })
  })
})

describe('systemAuthRepository.updateLanguage', () => {
  const systemMeBody = {
    id: 'sys-1',
    email: 'admin@example.com',
    display_name: 'SUPERADMIN',
    role: 'superadmin',
    language_code: 'uz-Cyrl',
    permissions: ['*'],
    totp_enrolled: true,
  }

  test('PATCHes the language and maps the fresh SYSTEM profile', async () => {
    const harness = makeHarness()
    harness.setRespond(() => jsonOk(systemMeBody))

    const result = await harness.repository.updateLanguage('uz-Cyrl')

    expect(harness.calls).toHaveLength(1)
    expect(harness.calls[0]?.path).toBe('/api/v1/system/auth/me')
    expect(harness.calls[0]?.init?.body).toEqual({ language_code: 'uz-Cyrl' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.languageCode).toBe('uz-Cyrl')
    expect(result.value.uuid).toBe('sys-1')
  })

  test('surfaces an unsupported language by its machine code', async () => {
    const harness = makeHarness()
    // The client rejects regardless of input (the backend validates the code,
    // not this client), so a supported code still exercises the 422 path.
    harness.setRespond(() => apiError(422, 'system_language_unsupported'))

    const result = await harness.repository.updateLanguage('uz-Cyrl')

    if (result.ok) throw new Error('expected the 422 to surface as an error')
    // The copy is chosen from `code`, never from the backend's `message`.
    expect(result.error).toEqual({
      kind: 'Unprocessable',
      status: 422,
      code: 'system_language_unsupported',
    })
  })
})

describe('systemAuthRepository.verifyTotp', () => {
  test('sends the pre-auth header and opens the session from a SYSTEM token', async () => {
    const harness = makeHarness()
    const accessToken = systemAccessToken()
    harness.setRespond((call) =>
      call.path.endsWith('/auth/login')
        ? jsonOk(preAuthBody())
        : jsonOk({ access_token: accessToken, expires_in: 300 }),
    )

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    const result = await harness.repository.verifyTotp('123456')

    expect(harness.calls).toHaveLength(2)
    expect(harness.calls[1]?.path).toBe('/api/v1/system/auth/totp')
    expect(harness.calls[1]?.init?.body).toEqual({ code: '123456' })
    expect(harness.calls[1]?.init?.headers).toEqual({ 'X-System-Pre-Auth': 'pre-auth-1' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.principal).toEqual(SYSTEM_PRINCIPAL)
    expect(harness.tokens.get()).toBe(accessToken)
    expect(harness.sessions).toEqual([accessToken])
  })

  test('keeps the pre-auth token after a wrong code so the same step can retry', async () => {
    const harness = makeHarness()
    const accessToken = systemAccessToken()
    let verifyCalls = 0
    harness.setRespond((call) => {
      if (call.path.endsWith('/auth/login')) return jsonOk(preAuthBody())
      verifyCalls += 1
      return verifyCalls === 1
        ? apiError(401, 'totp_invalid')
        : jsonOk({ access_token: accessToken, expires_in: 300 })
    })

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    const rejected = await harness.repository.verifyTotp('000000')
    const accepted = await harness.repository.verifyTotp('123456')

    if (rejected.ok) throw new Error('expected the wrong code to fail')
    expect(rejected.error).toEqual({ kind: 'Unauthorized', status: 401, code: 'totp_invalid' })
    // The retry still presents the token issued by the password step.
    expect(harness.calls[2]?.init?.headers).toEqual({ 'X-System-Pre-Auth': 'pre-auth-1' })
    if (!accepted.ok) throw new Error('expected the retry to open the session')
    expect(harness.tokens.get()).toBe(accessToken)
  })

  test('drops the pre-auth token when the backend reports it spent', async () => {
    const harness = makeHarness()
    harness.setRespond((call) =>
      call.path.endsWith('/auth/login')
        ? jsonOk(preAuthBody())
        : apiError(401, 'system_pre_auth_invalid'),
    )

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    const spent = await harness.repository.verifyTotp('123456')
    const afterSpent = await harness.repository.verifyTotp('123456')

    if (spent.ok) throw new Error('expected the spent token to fail')
    expect(spent.error).toEqual({
      kind: 'Unauthorized',
      status: 401,
      code: 'system_pre_auth_invalid',
    })
    // No live token left: the failure is decided locally, without a request.
    expect(harness.calls).toHaveLength(2)
    if (afterSpent.ok) throw new Error('expected no live pre-auth token')
    expect(afterSpent.error).toEqual({
      kind: 'Unauthorized',
      status: 401,
      code: 'system_pre_auth_invalid',
    })
  })
})

describe('systemAuthRepository pre-auth lifecycle', () => {
  test('treats the token as spent once expires_in has elapsed (no request is sent)', async () => {
    const harness = makeHarness()
    harness.setRespond(() => jsonOk(preAuthBody({ expires_in: 0 })))

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    const result = await harness.repository.enrollTotp()

    expect(harness.calls).toHaveLength(1)
    if (result.ok) throw new Error('expected the locally expired token to fail')
    expect(result.error).toEqual({
      kind: 'Unauthorized',
      status: 401,
      code: 'system_pre_auth_invalid',
    })
  })

  test('a new login attempt invalidates the token armed by the previous one', async () => {
    const harness = makeHarness()
    const accessToken = systemAccessToken()
    let loginCount = 0
    harness.setRespond((call) => {
      if (call.path.endsWith('/auth/login')) {
        loginCount += 1
        return jsonOk(preAuthBody({ pre_auth_token: `pre-auth-${loginCount}` }))
      }
      return jsonOk({ access_token: accessToken, expires_in: 300 })
    })

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'first' })
    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'second' })
    await harness.repository.verifyTotp('123456')

    expect(harness.calls[2]?.init?.headers).toEqual({ 'X-System-Pre-Auth': 'pre-auth-2' })
  })

  test('logout forgets the pending token as well', async () => {
    const harness = makeHarness()
    let respondLogout = false
    harness.setRespond((call) => {
      if (call.path.endsWith('/auth/login')) return jsonOk(preAuthBody())
      return respondLogout ? jsonOk(undefined) : apiError(401, 'totp_invalid')
    })

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    respondLogout = true
    await harness.repository.logout()
    // Restore the login response so the assertion below cannot pass by accident.
    respondLogout = false
    const result = await harness.repository.verifyTotp('123456')

    if (result.ok) throw new Error('expected no live pre-auth token after logout')
    expect(result.error).toEqual({
      kind: 'Unauthorized',
      status: 401,
      code: 'system_pre_auth_invalid',
    })
  })
})

describe('systemAuthRepository enrollment', () => {
  test('enroll sends no body and maps the one-time secret', async () => {
    const harness = makeHarness()
    harness.setRespond((call) =>
      call.path.endsWith('/auth/login')
        ? jsonOk(preAuthBody({ totp_enrolled: false }))
        : jsonOk({
            secret: 'JBSWY3DPEHPK3PXP',
            otpauth_uri: 'otpauth://totp/mfin:admin?secret=X',
          }),
    )

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    const result = await harness.repository.enrollTotp()

    expect(harness.calls[1]?.path).toBe('/api/v1/system/auth/totp/enroll')
    expect(harness.calls[1]?.init?.body).toBeUndefined()
    expect(harness.calls[1]?.init?.headers).toEqual({ 'X-System-Pre-Auth': 'pre-auth-1' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value).toEqual({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/mfin:admin?secret=X',
    })
  })

  test('activate confirms with a code and maps the recovery codes', async () => {
    const harness = makeHarness()
    harness.setRespond((call) => {
      if (call.path.endsWith('/auth/login')) return jsonOk(preAuthBody({ totp_enrolled: false }))
      if (call.path.endsWith('/totp/enroll')) {
        return jsonOk({ secret: 'S', otpauth_uri: 'otpauth://x' })
      }
      return jsonOk({ recovery_codes: ['abcd-efgh', 'ijkl-mnop'] })
    })

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    await harness.repository.enrollTotp()
    const result = await harness.repository.activateTotp('123456')

    expect(harness.calls[2]?.path).toBe('/api/v1/system/auth/totp/activate')
    expect(harness.calls[2]?.init?.body).toEqual({ code: '123456' })
    expect(harness.calls[2]?.init?.headers).toEqual({ 'X-System-Pre-Auth': 'pre-auth-1' })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.codes).toEqual(['abcd-efgh', 'ijkl-mnop'])
  })
})

describe('systemAuthRepository principal', () => {
  test('rejects a token minted for another audience instead of opening a session', async () => {
    const harness = makeHarness()
    const foreignToken = jwt({ sub: 'sys-1', exp: 1_700_000_000, aud: 'identity' })
    harness.setRespond((call) =>
      call.path.endsWith('/auth/login')
        ? jsonOk(preAuthBody())
        : jsonOk({ access_token: foreignToken, expires_in: 300 }),
    )

    await harness.repository.beginLogin({ email: 'admin@example.com', password: 'secret' })
    const result = await harness.repository.verifyTotp('123456')

    if (result.ok) throw new Error('expected a foreign-audience token to be rejected')
    expect(result.error).toEqual({ kind: 'Forbidden', status: 403 })
    expect(harness.tokens.get()).toBeNull()
    expect(harness.sessions).toEqual([])
  })

  test('toOutcome applies the same audience check to a token from another tab', () => {
    const harness = makeHarness()
    const accessToken = systemAccessToken()

    expect(harness.repository.toOutcome(jwt({ sub: 'sys-1', aud: 'identity' }))).toEqual({
      ok: false,
      error: { kind: 'Forbidden', status: 403 },
    })
    expect(harness.repository.toOutcome(accessToken)).toEqual({
      ok: true,
      value: { principal: SYSTEM_PRINCIPAL },
    })
    // Adopting a sibling tab's token is the session runtime's job, not this one.
    expect(harness.tokens.get()).toBeNull()
  })
})

describe('systemAuthRepository session', () => {
  test('refresh delegates to the single-flight session runtime', async () => {
    const harness = makeHarness()

    const result = await harness.repository.refresh()

    expect(harness.refreshCalls()).toBe(1)
    expect(harness.calls).toEqual([])
    if (!result.ok) throw new Error('expected the runtime result to pass through')
    expect(result.value.principal).toEqual(SYSTEM_PRINCIPAL)
  })

  test('performRefresh rotates the token bodylessly and re-files the access token', async () => {
    const harness = makeHarness()
    const accessToken = systemAccessToken()
    harness.tokens.set('stale-token')
    harness.setRespond(() => jsonOk({ access_token: accessToken, expires_in: 300 }))

    const result = await harness.repository.performRefresh()

    expect(harness.calls).toHaveLength(1)
    expect(harness.calls[0]?.path).toBe('/api/v1/system/auth/refresh')
    expect(harness.calls[0]?.init?.body).toBeUndefined()
    expect(harness.calls[0]?.init?.headers).toBeUndefined()
    if (!result.ok) throw new Error('expected the refresh to succeed')
    expect(harness.tokens.get()).toBe(accessToken)
    expect(harness.sessions).toEqual([accessToken])
  })

  test('performRefresh clears local state when the cookie is no longer accepted', async () => {
    const harness = makeHarness()
    harness.tokens.set('stale-token')
    harness.setRespond(() => apiError(401, 'system_refresh_invalid'))

    const result = await harness.repository.performRefresh()

    if (result.ok) throw new Error('expected the refresh to fail')
    expect(result.error).toEqual({
      kind: 'Unauthorized',
      status: 401,
      code: 'system_refresh_invalid',
    })
    expect(harness.tokens.get()).toBeNull()
    expect(harness.sessions).toEqual([null])
  })

  test('logout is bodyless and clears local state even when the request fails', async () => {
    const harness = makeHarness()
    harness.tokens.set('access-token')
    harness.setRespond(() => {
      harness.events.push('request')
      return apiError(500, 'system_logout_failed')
    })

    const result = await harness.repository.logout()

    expect(harness.calls).toHaveLength(1)
    expect(harness.calls[0]?.path).toBe('/api/v1/system/auth/logout')
    expect(harness.calls[0]?.init?.body).toBeUndefined()
    // The in-flight 401 guard is armed before the request is sent.
    expect(harness.events.slice(0, 2)).toEqual(['logout-start', 'request'])
    expect(harness.events).toContain('logout-failed')
    expect(harness.events).toContain('logged-out')
    expect(harness.tokens.get()).toBeNull()
    expect(harness.sessions).toEqual([null])
    if (result.ok) throw new Error('expected the 500 to surface as an error')
  })
})

describe('systemAuthRepository.getProfile', () => {
  test('maps the SYSTEM me row onto the shared profile shape', async () => {
    const harness = makeHarness()
    harness.setRespond(() =>
      jsonOk({
        id: '018f0000-0000-7000-8000-000000000001',
        email: 'admin@example.com',
        display_name: 'Ops Admin',
        role: 'operator',
        permissions: ['system.organizations.read'],
        totp_enrolled: true,
      }),
    )

    const result = await harness.repository.getProfile()

    expect(harness.calls[0]?.path).toBe('/api/v1/system/auth/me')
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value).toEqual({
      uuid: '018f0000-0000-7000-8000-000000000001',
      fullName: 'Ops Admin',
      email: 'admin@example.com',
      // The SYSTEM realm exposes neither a phone number nor a saved language.
      phoneNumber: null,
      languageCode: null,
      emailVerifiedAt: null,
    })
  })

  test('surfaces a failure instead of fabricating a profile', async () => {
    const harness = makeHarness()
    harness.setRespond(() => apiError(503, 'service_unavailable'))

    const result = await harness.repository.getProfile()

    if (result.ok) throw new Error('expected the 503 to surface as an error')
    expect(result.error).toEqual({
      kind: 'ServiceUnavailable',
      status: 503,
      code: 'service_unavailable',
    })
  })
})
