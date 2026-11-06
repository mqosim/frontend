import type { AppError } from '@/shared/domain'
import { errorMessageKey } from '@/shared/presentation/errors/messages'

/**
 * The mutations the admin pages can attempt. The kind lets a `409` pick the
 * right copy: the backend uses 409 both for "you cannot block yourself" and for
 * "that would remove the last administrator".
 */
export type AdminActionKind =
  | 'block-user'
  | 'unblock-user'
  | 'revoke-user-sessions'
  | 'block-org'
  | 'unblock-org'
  | 'block-system-user'
  | 'unblock-system-user'
  | 'revoke-system-user-sessions'

/** Maps an action failure to the i18n key whose copy explains it. */
export const adminActionErrorKey = (error: AppError, kind: AdminActionKind): string => {
  switch (error.kind) {
    case 'Forbidden':
      return 'system.action_error_forbidden'
    case 'NotFound':
      return 'system.action_error_not_found'
    case 'Unprocessable':
      return 'system.action_error_unprocessable'
    case 'ServiceUnavailable':
      return 'system.action_error_unavailable'
    case 'Network':
      return 'errors.network'
    case 'Conflict':
      switch (kind) {
        case 'block-system-user':
          // A SYSTEM block is refused both for your own account and for the last
          // active administrator; the status alone cannot tell them apart.
          return 'system.action_error_self_or_last_admin'
        case 'revoke-system-user-sessions':
          return 'system.action_error_self'
        case 'block-org':
        case 'block-user':
          return 'system.action_error_last_admin'
        default:
          return 'system.action_error_conflict'
      }
    default:
      return errorMessageKey(error)
  }
}

/** List/detail load failures: a 403 means the caller lacks the page permission. */
export const adminLoadErrorKey = (error: AppError): string =>
  error.kind === 'Forbidden' ? 'system.admin_error_forbidden' : errorMessageKey(error)
