/**
 * Failures raised by the local E-IMZO (ЭЦП) client integration. They are not
 * HTTP failures, so they carry a small code instead of a status.
 */
export type EimzoFailureCode =
  'client_unavailable' | 'no_keys' | 'api_key_missing' | 'cancelled' | 'wrong_password' | 'failed'

/**
 * One field-level problem attached to a backend validation failure, exactly as
 * the contract defines it: a JSON `path` addressing the rejected input
 * (`body.title`, `body.lines[0].unit_price`, `query.limit`, …) plus a machine
 * `code` naming the reason (`missing`, `json_invalid`, `money_scale`, …).
 * Submitted values are never echoed, so problems are safe to keep and log.
 */
export interface ApiErrorProblem {
  readonly path: string
  readonly code: string
}

/**
 * Every failure the UI reacts to, modelled as data rather than an exception.
 * UI copy is chosen from `kind` — and, where a finer distinction is needed,
 * from the backend's machine-readable `code`: the server's `message` string is
 * never surfaced (it is a developer-facing fallback and must not leak account
 * details).
 *
 * `code` carries the machine error code from the backend envelope
 * `{"error": {"code", "message", "problems?"}}` whenever one was present (e.g.
 * `revision_conflict`, `csrf_header_required`); it is absent for status-only
 * failures (a non-JSON body from a proxy, an unmapped status). `problems`
 * carries the field-level validation details the contract sends for
 * `validation_error`, `content_invalid`, and the register-start conflict.
 */
export type AppError =
  | { readonly kind: 'Unauthorized'; readonly status: 401; readonly code?: string }
  | { readonly kind: 'Forbidden'; readonly status: 403; readonly code?: string }
  | { readonly kind: 'NotFound'; readonly status: 404; readonly code?: string }
  | {
      readonly kind: 'Conflict'
      readonly status: 409
      readonly code?: string
      readonly problems?: readonly ApiErrorProblem[]
    }
  | {
      readonly kind: 'Unprocessable'
      readonly status: 422
      readonly code?: string
      readonly problems?: readonly ApiErrorProblem[]
    }
  | { readonly kind: 'ServiceUnavailable'; readonly status: 503; readonly code?: string }
  | {
      readonly kind: 'Validation'
      readonly status: 400
      readonly fields: Readonly<Record<string, string>>
      readonly code?: string
      readonly problems?: readonly ApiErrorProblem[]
    }
  | {
      readonly kind: 'RateLimited'
      readonly status: 429
      readonly retryAfterMs: number | null
      readonly code?: string
    }
  | { readonly kind: 'PayloadTooLarge'; readonly status: 413; readonly code?: string }
  | { readonly kind: 'Network'; readonly status: null }
  | { readonly kind: 'Eimzo'; readonly code: EimzoFailureCode }
  | { readonly kind: 'Unknown'; readonly status: number | null; readonly code?: string }

export type AppErrorKind = AppError['kind']
