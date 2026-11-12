/**
 * The SYSTEM caller's own admin identity and resolved grants, as served by
 * `GET /api/v1/system/auth/me`. The backend grants exactly one `role` (enforced
 * by a DB CHECK) and resolves `permissions` from it on every request; the UI
 * only uses the permission set to decide what to show (the backend remains the
 * authority and enforces every call).
 */
export interface AdminIdentity {
  readonly uuid: string
  readonly email: string | null
  readonly role: string | null
  readonly permissions: readonly string[]
}
