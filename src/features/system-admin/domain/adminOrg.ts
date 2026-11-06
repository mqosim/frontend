/** An organization on the control-plane surface (`AdminOrg`). UUID only. */
export interface AdminOrg {
  readonly uuid: string
  readonly tin: string
  readonly name: string
  readonly isActive: boolean
  readonly createdAt: string | null
  readonly updatedAt: string | null
}
