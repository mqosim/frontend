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

/**
 * Mutation failures of the i18n catalog endpoints. The backend reports its
 * invariants with dedicated machine codes (a default language cannot be
 * cleared, the last active language cannot be deactivated, a page must be empty
 * before deletion, keys are unique), so copy is chosen from the code first.
 */
const I18N_CODE_KEYS: Readonly<Record<string, string>> = {
  language_default_required: 'system.i18n_error_default_required',
  language_last_active: 'system.i18n_error_last_active',
  language_not_found: 'system.i18n_error_language_not_found',
  page_key_taken: 'system.i18n_error_page_key_taken',
  page_not_empty: 'system.i18n_error_page_not_empty',
  phrase_key_taken: 'system.i18n_error_phrase_key_taken',
  phrase_not_found: 'system.i18n_error_phrase_not_found',
  import_too_large: 'system.i18n_error_import_too_large',
  invalid_translation_key: 'system.i18n_error_invalid_key',
  invalid_translation_value: 'system.i18n_error_invalid_value',
  translation_value_too_long: 'system.i18n_error_value_too_long',
}

export const i18nActionErrorKey = (error: AppError): string => {
  if ('code' in error && error.code !== undefined) {
    const key = I18N_CODE_KEYS[error.code]
    if (key !== undefined) return key
  }
  return adminActionErrorKey(error, 'update-system-user')
}
