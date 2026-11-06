import type { AppError } from '@/shared/domain/errors'

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

/**
 * Maps an HTTP failure to an `AppError`. Only the status and the optional
 * validation `fields` map are read; the server's `message` is intentionally
 * discarded so UI copy is never driven by backend strings.
 */
export const toAppError = (response: Response, body: unknown): AppError => {
  switch (response.status) {
    case 400:
      return { kind: 'Validation', status: 400, fields: readValidationFields(body) }
    case 401:
      return { kind: 'Unauthorized', status: 401 }
    case 403:
      return { kind: 'Forbidden', status: 403 }
    case 404:
      return { kind: 'NotFound', status: 404 }
    case 409:
      return { kind: 'Conflict', status: 409 }
    case 422:
      return { kind: 'Unprocessable', status: 422 }
    case 503:
      return { kind: 'ServiceUnavailable', status: 503 }
    case 413:
      return { kind: 'PayloadTooLarge', status: 413 }
    case 429:
      return {
        kind: 'RateLimited',
        status: 429,
        retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')),
      }
    default:
      return { kind: 'Unknown', status: response.status }
  }
}

export const networkError = (): AppError => ({ kind: 'Network', status: null })
