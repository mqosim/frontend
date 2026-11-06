/** The two directory account kinds exposed by `/admin/users`. */
export type AdminUserType = 'PERSON' | 'ORG'

/** A PERSON/ORG account on the control-plane surface (`AdminUser`). UUID only. */
export interface AdminUser {
  readonly uuid: string
  readonly userType: AdminUserType
  readonly email: string | null
  readonly phoneNumber: string | null
  readonly isActive: boolean
  readonly languageCode: string
  readonly emailVerifiedAt: string | null
  readonly createdAt: string | null
  readonly updatedAt: string | null
}

/** A SYSTEM account (`AdminSystemUser`): an AdminUser plus its role bundles. */
export interface AdminSystemUser extends AdminUser {
  readonly roles: readonly string[]
}
