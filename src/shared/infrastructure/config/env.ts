/**
 * The API version prefix. Every generated spec path already begins with it
 * (`/api/v1/identity/login`, `/api/v1/public/translations`, …), so the configured
 * base URL must NOT repeat it — those paths are absolute on their own.
 */
export const API_PREFIX = '/api/v1'

export interface AppEnv {
  readonly apiBaseUrl: string
  /** The app's own base URL (Vite `base`), used to resolve files in `public/`. */
  readonly baseUrl: string
}

export interface NormalisedBaseUrl {
  /** The usable base URL (an origin, or empty for same-origin). */
  readonly baseUrl: string
  /** True when a redundant `/api/v1` suffix was present and removed. */
  readonly strippedApiPrefix: boolean
}

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

/**
 * Normalises the optional `VITE_API_BASE_URL` override.
 *
 * The default is EMPTY: requests stay same-origin and the spec paths carry
 * `/api/v1` themselves. The variable exists only to target another origin (for
 * example `https://api.example.com`) and must not include `/api/v1`. Trailing
 * slashes are removed, and a trailing `/api/v1` is stripped so the doubled-prefix
 * bug (`/api/v1/api/v1/…`) cannot silently return; the caller reports that.
 */
export const normaliseApiBaseUrl = (raw: string): NormalisedBaseUrl => {
  let baseUrl = stripTrailingSlashes(raw.trim())
  let strippedApiPrefix = false
  if (baseUrl.endsWith(API_PREFIX)) {
    baseUrl = stripTrailingSlashes(baseUrl.slice(0, -API_PREFIX.length))
    strippedApiPrefix = true
  }
  return { baseUrl, strippedApiPrefix }
}

/** Reads build-time configuration. */
export const readEnv = (): AppEnv => {
  const baseUrl = import.meta.env.BASE_URL
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw !== 'string') return { apiBaseUrl: '', baseUrl }

  const { baseUrl: apiBaseUrl, strippedApiPrefix } = normaliseApiBaseUrl(raw)
  // Behind the static `import.meta.env.DEV` flag, so this warning (and its
  // string) is dropped from production bundles.
  if (import.meta.env.DEV && strippedApiPrefix) {
    console.warn(
      `[env] VITE_API_BASE_URL must be an origin without the "${API_PREFIX}" suffix ` +
        `(every API path already includes it). Using "${apiBaseUrl}".`,
    )
  }
  return { apiBaseUrl, baseUrl }
}
