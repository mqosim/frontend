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
 * (no user enumeration), and must treat a 403 the same way — except a blocked
 * account, which the contract reports with its own machine code so the user is
 * told to contact support instead of retrying a password.
 */
export const credentialErrorMessageKey = (error: AppError): string => {
  if ('code' in error && error.code === 'account_blocked') return 'errors.account_blocked'
  if (error.kind === 'Unauthorized' || error.kind === 'Forbidden') {
    return 'errors.invalid_credentials'
  }
  return errorMessageKey(error)
}

/**
 * Copy for the password+OTP registration codes (`register/start` and
 * `register/complete`). The contract exposes these machine codes, so the copy
 * is chosen from the code first; any other failure falls back to the shared
 * kind-based copy. The backend `message` is never surfaced.
 */
const REGISTER_ERROR_KEYS: Readonly<Record<string, string>> = {
  otp_invalid: 'errors.otp_invalid',
  too_many_otp_attempts: 'errors.too_many_otp_attempts',
  registration_expired: 'errors.registration_expired',
  identifier_already_registered: 'errors.identifier_already_registered',
  weak_password: 'errors.weak_password',
  otp_delivery_failed: 'errors.otp_delivery_failed',
  sms_budget_exceeded: 'errors.sms_budget_exceeded',
  rate_limited: 'errors.rate_limited',
}

export const registerErrorMessageKey = (error: AppError): string => {
  if ('code' in error && error.code !== undefined) {
    const key = REGISTER_ERROR_KEYS[error.code]
    if (key !== undefined) return key
  }
  return errorMessageKey(error)
}
