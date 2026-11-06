import createClient, { type Middleware } from 'openapi-fetch'

import type { AppError } from '@/shared/domain/errors'
import { err, ok } from '@/shared/domain/result'
import type { Result } from '@/shared/domain/result'
import { API_PREFIX } from '@/shared/infrastructure/config/env'
import { networkError, toAppError } from '@/shared/infrastructure/http/errors'
import type { paths } from './schema'

/**
 * Endpoints that authenticate with an httpOnly cookie. Only these send
 * `credentials: 'include'`; everything else keeps the fetch default
 * (`same-origin`) so cookies are not attached where they are not needed.
 */
const COOKIE_ENDPOINTS = [
  '/auth/login',
  '/auth/login_with_signature',
  '/auth/login_with_usb',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/select_workspace',
  '/auth/switch_workspace',
  '/system/auth/login',
  '/system/auth/refresh',
  '/system/auth/logout',
]

/**
 * Endpoints whose 401 is a credential/session result the caller handles, never a
 * recoverable expiry. These must NOT trigger the shared refresh-and-retry: a bad
 * login must not rotate the session, and a failed refresh/logout must surface as
 * an error instead of recursing into itself.
 */
const NO_RETRY_ENDPOINTS = [
  '/auth/login',
  '/auth/login_with_signature',
  '/auth/login_with_usb',
  '/auth/register',
  '/auth/challenge',
  '/auth/refresh',
  '/auth/logout',
  '/auth/logout_all',
  '/auth/select_workspace',
  '/auth/switch_workspace',
  '/system/auth/login',
  '/system/auth/refresh',
  '/system/auth/logout',
]

export interface ApiClientOptions {
  readonly baseUrl: string
  /** Reads the in-memory access token, injected as `Authorization: Bearer`. */
  readonly getAccessToken: () => string | null
  /**
   * Called at most once when an authenticated request answers 401. Resolves `true`
   * when a fresh access token is in place, so the request is retried once; `false`
   * otherwise. Never called for the endpoints in `NO_RETRY_ENDPOINTS`.
   */
  readonly onUnauthorized?: () => Promise<boolean>
}

type RawApiClient = ReturnType<typeof createClient<paths>>

export type ApiClient = ReturnType<typeof createApiClient>

/** Reads the 401 status from an openapi-fetch result without assuming its shape. */
const isUnauthorized = (result: unknown): boolean => {
  if (typeof result !== 'object' || result === null) return false
  const response = (result as { response?: unknown }).response
  return response instanceof Response && response.status === 401
}

/** True when the request targets an endpoint that must never auto-refresh. */
const isNoRetryPath = (args: readonly unknown[]): boolean => {
  const path = args[0]
  return typeof path === 'string' && NO_RETRY_ENDPOINTS.some((suffix) => path.endsWith(suffix))
}

/**
 * `openapi-fetch` re-throws the underlying fetch error when it is not handled by
 * middleware. A refused connection (backend down, dev proxy unreachable) would
 * then escape as an exception instead of a `Result`. This proxy converts any
 * thrown error into the `response: undefined` shape that `toResult` maps to a
 * `Network` error, so callers only ever deal with `Result`.
 *
 * When `onUnauthorized` is provided it also gives every authenticated call one
 * silent recovery: a 401 renews the access token once and the request is retried
 * once. It never loops, and login/refresh/logout stay untouched. It is
 * type-transparent: the proxy keeps the client's exact method signatures.
 */
const guardNetworkErrors = (
  client: RawApiClient,
  onUnauthorized?: () => Promise<boolean>,
): RawApiClient =>
  new Proxy(client, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver)
      if (typeof value !== 'function') return value
      // `use` registers middleware and must stay bound to the real client.
      if (property === 'use') return value.bind(target)
      return async (...args: unknown[]) => {
        try {
          const result = await Reflect.apply(value, target, args)
          if (onUnauthorized !== undefined && isUnauthorized(result) && !isNoRetryPath(args)) {
            let recovered = false
            try {
              recovered = await onUnauthorized()
            } catch {
              recovered = false
            }
            if (recovered) return await Reflect.apply(value, target, args)
          }
          return result
        } catch {
          return { error: networkError(), response: undefined }
        }
      }
    },
  })

export const createApiClient = ({ baseUrl, getAccessToken, onUnauthorized }: ApiClientOptions) => {
  const client = createClient<paths>({ baseUrl })

  const bearer: Middleware = {
    onRequest({ request }) {
      const token = getAccessToken()
      if (token !== null) request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
  }

  const cookies: Middleware = {
    onRequest({ request }) {
      if (COOKIE_ENDPOINTS.some((suffix) => new URL(request.url).pathname.endsWith(suffix))) {
        // `Request.credentials` is read-only; rebuild the request with the flag.
        return new Request(request, { credentials: 'include' })
      }
      return request
    },
  }

  client.use(bearer, cookies)

  // Dev-only safety net. Spec paths already start with `/api/v1`, so a base URL
  // that also carries it yields `/api/v1/api/v1/…`. Report that once per client
  // (as a loud developer error) instead of letting it surface as a confusing
  // 404. `import.meta.env.DEV` is a literal `false` in production builds, so this
  // block is tree-shaken out of the bundle.
  if (import.meta.env.DEV) {
    let reported = false
    client.use({
      onRequest({ request }) {
        if (reported) return request
        const { pathname } = new URL(request.url)
        if (pathname.includes(`${API_PREFIX}${API_PREFIX}`)) {
          reported = true
          console.error(
            `[api] Doubled "${API_PREFIX}" in ${request.method} ${pathname}. ` +
              'VITE_API_BASE_URL must be an origin (e.g. https://api.example.com), not a path.',
          )
        }
        return request
      },
    })
  }

  return guardNetworkErrors(client, onUnauthorized)
}

/** The shape openapi-fetch resolves to, before normalisation. */
export interface ApiCall<T> {
  readonly data?: T
  readonly error?: unknown
  readonly response?: Response
}

/** Normalises an openapi-fetch result into a `Result`. */
export const toResult = <T>(call: ApiCall<T>): Result<T, AppError> => {
  if (call.response === undefined) return err(networkError())
  if (call.response.ok) return ok(call.data as T)
  return err(toAppError(call.response, call.error))
}
