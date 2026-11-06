/**
 * The control-plane permission catalogue, mirrored from the backend
 * (`internal/master/domain/authorization.go`). These codes are opaque strings on
 * the wire; naming them here keeps the UI free of scattered literals and lets
 * the compiler catch a typo in a menu/button gate.
 *
 * A permission is a capability, not a role: the UI checks the resolved
 * permission set on the admin identity rather than granting features by role.
 */
export const ADMIN_PERMISSIONS = {
  // Control-plane reference data (languages, pages, phrases, countries).
  systemReferenceRead: 'system.reference.read',
  systemReferenceWrite: 'system.reference.write',

  // User administration.
  systemUserRead: 'system.user.read',
  systemUserBlock: 'system.user.block',
  systemUserUnblock: 'system.user.unblock',

  // Session administration.
  systemSessionRevoke: 'system.session.revoke',

  // Organization administration.
  systemOrgRead: 'system.org.read',
  systemOrgBlock: 'system.org.block',
  systemOrgUnblock: 'system.org.unblock',

  // Role administration.
  systemRoleRead: 'system.role.read',
  systemRoleManage: 'system.role.manage',

  // Audit log.
  systemAuditRead: 'system.audit.read',

  // Reserved for the 2FA phase.
  systemSecurityTwoFactorReset: 'system.security.two_factor.reset',

  // Reserved for a future document-metadata surface; no endpoint uses it yet.
  documentMetadataRead: 'document.metadata.read',
} as const

export type AdminPermissionCode = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS]

/** True when the resolved grant set contains `permission` (exact match). */
export const grantsPermission = (
  granted: readonly string[],
  permission: AdminPermissionCode,
): boolean => granted.includes(permission)
