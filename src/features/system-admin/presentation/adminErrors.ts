import type { AppError } from '@/shared/domain'
import { errorMessageKey } from '@/shared/presentation/errors/messages'

/**
 * The mutations the admin pages can attempt. The kind lets a `409` pick the
 * right copy: the backend uses 409 for "you cannot disable yourself" and for
 * "that would remove the last active superadmin".
 */
export type AdminActionKind = 'suspend-org' | 'reactivate-org' | 'update-system-user'

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
      // A staff PATCH is refused both for your own account (self-disable) and
      // for the last active superadmin; the body alone cannot tell them apart.
      return kind === 'update-system-user'
        ? 'system.action_error_self_or_last_admin'
        : 'system.action_error_conflict'
    default:
      return errorMessageKey(error)
  }
}

/** List/detail load failures: a 403 means the caller lacks the page permission. */
export const adminLoadErrorKey = (error: AppError): string =>
  error.kind === 'Forbidden' ? 'system.admin_error_forbidden' : errorMessageKey(error)
