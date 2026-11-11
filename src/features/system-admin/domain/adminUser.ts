/**
 * A staff (system user) account, as served by `SystemUserResponse`. The role is
 * singular — the backend grants exactly one of the fixed roles, and `status` is
 * `"active"` or `"disabled"` (`PATCH /system/users/{id}` flips it; there are no
 * separate block/unblock or session-revoke endpoints in this contract).
 */
export interface AdminSystemUser {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly role: string
  readonly status: string
  readonly totpEnrolled: boolean
  readonly createdAt: string | null
  readonly updatedAt: string | null
}

/**
 * A platform user (PERSON/ORG) belonging to one tenant, as served by
 * `SystemTenantMemberResponse` of `GET /system/tenants/{id}/users`. Members are
 * tenant-scoped — the contract has no global user directory — and read-only:
 * no member mutation endpoint exists.
 */
export interface AdminMember {
  readonly userId: string
  readonly role: string
  readonly status: string
  readonly fullName: string
  readonly emailMasked: string | null
  readonly phoneMasked: string | null
  readonly identityStatus: string
}

/**
 * The editable fields of a staff account (`SystemUserUpdateRequest`). Omitted
 * fields are left out of the PATCH body; the backend rejects a change that
 * would disable the caller themselves or the last active superadmin with 409.
 */
export interface AdminSystemUserPatch {
  readonly displayName?: string
  readonly role?: string
  readonly status?: string
}
