/** A control-plane role bundle and the permission codes it grants. */
export interface AdminRole {
  readonly code: string
  readonly description: string
  readonly permissions: readonly string[]
}
