import type { ApiErrorProblem, AppError } from '@/shared/domain/errors'

/**
 * The backend's error envelope body (the contract's `ErrorBody`):
 * `{"error": {"code", "message", "problems?"}}`. Typed here structurally —
 * the generated schema module still carries the previous backend contract and
 * is swapped together with the feature slices that consume it.
 */
export interface ApiErrorBody {
  readonly code: string
  readonly message: string
  readonly problems?: readonly ApiErrorProblem[] | null
}

/** `Retry-After` may be delta-seconds or an HTTP-date; both map to milliseconds. */
const parseRetryAfter = (header: string | null): number | null => {
  if (header === null) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000)
  const date = Date.parse(header)
  if (!Number.isNaN(date)) {
    const delta = date - Date.now()
    return delta > 0 ? delta : 0
  }
  return null
}

/** Old-contract validation map (kept for the not-yet-migrated slices). */
const readValidationFields = (body: unknown): Record<string, string> => {
  if (typeof body !== 'object' || body === null) return {}
  const fields = (body as { fields?: unknown }).fields
  if (typeof fields !== 'object' || fields === null) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Sanitises the envelope's `problems` array: only well-formed `{path, code}`
 * pairs survive, so a non-conforming body can never smuggle unexpected shapes
 * into the application. Absent or non-array `problems` stay absent.
 */
const readProblems = (raw: unknown): readonly ApiErrorProblem[] | undefined => {
  if (!Array.isArray(raw)) return undefined
  const problems: ApiErrorProblem[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    if (typeof item.path === 'string' && typeof item.code === 'string') {
      problems.push({ path: item.path, code: item.code })
    }
  }
  return problems
}

/**
 * Reads the machine `code` and `problems` out of an error body. Returns `null`
 * when the body is not the expected envelope (a non-JSON body, an HTML error
 * page from a proxy, or any unexpected shape) so the caller can fall back to
 * status-only mapping. The envelope's developer-facing `message` is
 * deliberately discarded: UI copy is chosen from the code, never from backend
 * strings, and the code alone cannot leak account details.
 */
const readErrorEnvelope = (
  body: unknown,
): { readonly code: string; readonly problems?: readonly ApiErrorProblem[] } | null => {
  if (!isRecord(body) || !isRecord(body.error)) return null
  const error = body.error
  if (typeof error.code !== 'string' || error.code === '') return null
  const problems = readProblems(error.problems)
  return problems === undefined ? { code: error.code } : { code: error.code, problems }
}

/**
 * Maps an HTTP failure to an `AppError`. The backend envelope's machine `code`
 * and field-level `problems` are preserved when the body carries them; a
 * malformed or unexpected body still yields the status-based kind. UI copy is
 * never driven by backend strings.
 */
export const toAppError = (response: Response, body: unknown): AppError => {
  const envelope = readErrorEnvelope(body)
  const code = envelope?.code
  const problems = envelope?.problems
  switch (response.status) {
    case 400:
      return {
        kind: 'Validation',
        status: 400,
        fields: readValidationFields(body),
        ...(code === undefined ? {} : { code }),
        ...(problems === undefined ? {} : { problems }),
      }
    case 401:
      return { kind: 'Unauthorized', status: 401, ...(code === undefined ? {} : { code }) }
    case 403:
      return { kind: 'Forbidden', status: 403, ...(code === undefined ? {} : { code }) }
    case 404:
      return { kind: 'NotFound', status: 404, ...(code === undefined ? {} : { code }) }
    case 409:
      return {
        kind: 'Conflict',
        status: 409,
        ...(code === undefined ? {} : { code }),
        ...(problems === undefined ? {} : { problems }),
      }
    case 413:
      return { kind: 'PayloadTooLarge', status: 413, ...(code === undefined ? {} : { code }) }
    case 422:
      return {
        kind: 'Unprocessable',
        status: 422,
        ...(code === undefined ? {} : { code }),
        ...(problems === undefined ? {} : { problems }),
      }
    case 429:
      return {
        kind: 'RateLimited',
        status: 429,
        retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')),
        ...(code === undefined ? {} : { code }),
      }
    case 503:
      return { kind: 'ServiceUnavailable', status: 503, ...(code === undefined ? {} : { code }) }
    default:
      return { kind: 'Unknown', status: response.status, ...(code === undefined ? {} : { code }) }
  }
}

export const networkError = (): AppError => ({ kind: 'Network', status: null })
