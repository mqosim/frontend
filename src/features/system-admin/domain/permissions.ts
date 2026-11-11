/**
 * The control-plane permission catalogue, mirrored from the FastAPI backend
 * (`modules/system/domain/permissions.py`, ADR 0016 §7). The catalog is code,
 * not database rows: adding a permission is a reviewed backend change first, so
 * this list must never drift ahead of or behind it. Codes are opaque strings on
 * the wire; naming them here keeps the UI free of scattered literals and lets
 * the compiler catch a typo in a menu/button gate.
 *
 * A permission is a capability, not a role: the backend resolves the caller's
 * grant set from their single role (`permissions_for`; unknown roles grant
 * nothing), and the UI only checks that set to decide what to show — the
 * server still enforces every call.
 */
export const ADMIN_PERMISSIONS = {
  // Staff (system user) administration; role assignment is a write.
  systemUsersRead: 'system.users.read',
  systemUsersWrite: 'system.users.write',

  // Tenant (organization) administration and their platform users.
  tenantsRead: 'tenants.read',
  tenantsManage: 'tenants.manage',
  tenantsUsersRead: 'tenants.users.read',

  // Reference data (languages, pages, phrases).
  i18nRead: 'i18n.read',
  i18nManage: 'i18n.manage',

  // Audit chain.
  auditRead: 'audit.read',
  auditVerify: 'audit.verify',
} as const

export type AdminPermissionCode = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS]

/** True when the resolved grant set contains `permission` (exact match). */
export const grantsPermission = (
  granted: readonly string[],
  permission: AdminPermissionCode,
): boolean => granted.includes(permission)
