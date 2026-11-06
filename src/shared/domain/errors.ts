/**
 * Failures raised by the local E-IMZO (ЭЦП) client integration. They are not
 * HTTP failures, so they carry a small code instead of a status.
 */
export type EimzoFailureCode =
  'client_unavailable' | 'no_keys' | 'api_key_missing' | 'cancelled' | 'wrong_password' | 'failed'

/**
 * Every failure the UI reacts to, modelled as data rather than an exception.
 * UI copy is chosen from `kind` alone: the server's `message` string is never
 * surfaced (it is not user-facing and must not leak account details).
 */
export type AppError =
  | { readonly kind: 'Unauthorized'; readonly status: 401 }
  | { readonly kind: 'Forbidden'; readonly status: 403 }
  | { readonly kind: 'NotFound'; readonly status: 404 }
  | { readonly kind: 'Conflict'; readonly status: 409 }
  | { readonly kind: 'Unprocessable'; readonly status: 422 }
  | { readonly kind: 'ServiceUnavailable'; readonly status: 503 }
  | {
      readonly kind: 'Validation'
      readonly status: 400
      readonly fields: Readonly<Record<string, string>>
    }
  | { readonly kind: 'RateLimited'; readonly status: 429; readonly retryAfterMs: number | null }
  | { readonly kind: 'PayloadTooLarge'; readonly status: 413 }
  | { readonly kind: 'Network'; readonly status: null }
  | { readonly kind: 'Eimzo'; readonly code: EimzoFailureCode }
  | { readonly kind: 'Unknown'; readonly status: number | null }

export type AppErrorKind = AppError['kind']
