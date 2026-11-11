/**
 * One role's grants from the fixed permission catalogue
 * (`GET /system/permissions` → `SystemPermissionsResponse.roles`). Roles are
 * code, not database rows: `superadmin`, `operator` and `i18n_editor`, each
 * mapped to its permission set server-side.
 */
export interface AdminRoleOption {
  readonly role: string
  readonly permissions: readonly string[]
}
