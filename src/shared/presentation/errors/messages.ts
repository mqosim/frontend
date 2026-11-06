import type { AppError, EimzoFailureCode } from '@/shared/domain'

/** Copy for each kind of local E-IMZO failure. */
const EIMZO_ERROR_KEYS: Readonly<Record<EimzoFailureCode, string>> = {
  client_unavailable: 'errors.eimzo_unavailable',
  no_keys: 'errors.eimzo_no_keys',
  api_key_missing: 'errors.eimzo_api_key_missing',
  cancelled: 'errors.eimzo_cancelled',
  wrong_password: 'errors.eimzo_wrong_password',
  failed: 'errors.eimzo_failed',
}

/**
 * Maps an `AppError` to an i18n key. The key — never a server-provided string —
 * decides the copy, so backend messages cannot leak or be spoofed.
 */
export const errorMessageKey = (error: AppError): string => {
  switch (error.kind) {
    case 'Unauthorized':
      return 'errors.unauthorized'
    case 'Forbidden':
      return 'errors.forbidden'
    case 'NotFound':
      return 'errors.not_found'
    case 'Conflict':
      return 'errors.conflict'
    case 'Unprocessable':
      return 'errors.unprocessable'
    case 'ServiceUnavailable':
      return 'errors.service_unavailable'
    case 'Validation':
      return 'errors.validation'
    case 'RateLimited':
      return 'errors.rate_limited'
    case 'PayloadTooLarge':
      return 'errors.payload_too_large'
    case 'Network':
      return 'errors.network'
    case 'Eimzo':
      return EIMZO_ERROR_KEYS[error.code]
    default:
      return 'errors.generic'
  }
}

/**
 * Login-style endpoints deliberately return one generic 401 for every failure
 * (no user enumeration), and must treat a 403 the same way.
 */
export const credentialErrorMessageKey = (error: AppError): string => {
  if (error.kind === 'Unauthorized' || error.kind === 'Forbidden') {
    return 'errors.invalid_credentials'
  }
  return errorMessageKey(error)
}
