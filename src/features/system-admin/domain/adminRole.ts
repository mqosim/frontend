/**
 * The fixed system-realm roles, mirrored from the FastAPI backend
 * (`modules/system/domain/permissions.py`). Roles are code, not database rows:
 * the catalogue is a reviewed backend change first, so this list must never
 * drift ahead of or behind it.
 *
 * `AdminRoleOption` carries the role-to-permission grants returned by
 * `GET /system/permissions`; the role labels below are UI-only translations and
 * never decide access — permissions do.
 */
export const ADMIN_ROLES = ['superadmin', 'operator', 'i18n_editor'] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export const isAdminRole = (role: string): role is AdminRole =>
  ADMIN_ROLES.some((value) => value === role)

/**
 * Phrase key for a known role; `null` for an unknown value so callers render
 * the raw code instead of inventing a label. The `i18n_editor` label is the
 * product name "i18n Manager" — the identifier on the wire stays unchanged.
 */
const ROLE_LABEL_KEYS: Readonly<Record<AdminRole, string>> = {
  superadmin: 'system.role_superadmin',
  operator: 'system.role_operator',
  i18n_editor: 'system.role_i18n_editor',
}

export const adminRoleLabelKey = (role: string | null | undefined): string | null => {
  if (role === null || role === undefined) return null
  return isAdminRole(role) ? ROLE_LABEL_KEYS[role] : null
}

/**
 * One role's grants from the fixed permission catalogue
 * (`GET /system/permissions` → `SystemPermissionsResponse.roles`).
 */
export interface AdminRoleOption {
  readonly role: string
  readonly permissions: readonly string[]
}
