/**
 * A tenant (organization) on the control plane, as served by
 * `SystemTenantResponse`. `status` is `"active"` until the tenant is suspended
 * (`POST .../suspend`) and `"suspended"` afterwards.
 */
export interface AdminOrg {
  readonly id: string
  readonly type: string
  readonly name: string
  /** The tax number the backend calls STIR. */
  readonly stir: string
  readonly status: string
  readonly createdAt: string | null
}

/** One zero-filled document-status counter of a tenant's document totals. */
export interface AdminDocumentCount {
  readonly status: string
  readonly count: number
}

/**
 * The tenant detail the backend serves (`SystemTenantDetailResponse`): the
 * tenant row plus the aggregates the old contract computed client-side.
 */
export interface AdminOrgDetail {
  readonly org: AdminOrg
  readonly memberCount: number
  readonly documentCounts: readonly AdminDocumentCount[]
}
