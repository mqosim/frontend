import type { AppError } from '@/shared/domain'
import { credentialErrorMessageKey } from '@/shared/presentation/errors/messages'

/**
 * Copy for the SYSTEM sign-in steps. The sign-in endpoints return machine codes
 * that the shared kind-based mapping cannot tell apart — a locked account is a
 * 423 (`kind: 'Unknown'`), a spent pre-authentication token and a wrong TOTP code
 * are both 401s, and a first login is told apart only by `totp_enrolled`.
 *
 * The code therefore decides the copy first; anything unmapped falls back to the
 * shared login-style mapping (which already hides whether the account exists).
 * The backend `message` is never surfaced.
 */
const SYSTEM_AUTH_CODE_KEYS: Readonly<Record<string, string>> = {
  system_invalid_credentials: 'system.error_invalid_credentials',
  system_account_disabled: 'system.error_account_disabled',
  system_account_locked: 'system.error_account_locked',
  system_pre_auth_invalid: 'system.error_pre_auth_invalid',
  totp_invalid: 'system.error_totp_invalid',
  recovery_code_invalid: 'system.error_recovery_code_invalid',
  totp_not_enrolled: 'system.error_totp_not_enrolled',
  totp_already_enrolled: 'system.error_totp_already_enrolled',
}

/** True when the failure carries the given backend machine code. */
export const isSystemAuthCode = (error: AppError, code: string): boolean =>
  'code' in error && error.code === code

/** Maps a SYSTEM sign-in failure to the i18n key whose copy explains it. */
export const systemAuthErrorKey = (error: AppError): string => {
  if ('code' in error && error.code !== undefined) {
    const direct = SYSTEM_AUTH_CODE_KEYS[error.code]
    if (direct !== undefined) return direct
  }
  return credentialErrorMessageKey(error)
}
