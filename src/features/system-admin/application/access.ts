import type { AdminPermissionCode } from '../domain/permissions'

/**
 * The declarative permission gate a SYSTEM route (or any admin control) can
 * carry. `permission` is an exact grant; `permissions` is any-of. Both absent
 * means "any authenticated SYSTEM account" (the Dashboard, Settings, and the
 * access-denied fallback).
 */
export interface PermissionGate {
  readonly permission?: AdminPermissionCode
  readonly permissions?: readonly AdminPermissionCode[]
}

/**
 * Pure gate evaluation over a resolved grant set. Missing/unknown permissions
 * deny; the backend still enforces every call, so this only decides what the
 * caller is shown.
 */
export const grantsGate = (grants: readonly string[], gate: PermissionGate): boolean => {
  if (gate.permission !== undefined) return grants.includes(gate.permission)
  if (gate.permissions !== undefined) {
    return gate.permissions.some((permission) => grants.includes(permission))
  }
  return true
}
