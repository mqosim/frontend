/**
 * Unit tests for the SYSTEM admin mappers: identity, tenants and their
 * members, staff accounts, the permission catalogue and audit entries.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * The `--tsconfig-override` flag is required because the `@/` path alias is
 * declared in `tsconfig.app.json`, which bun does not read by default. The
 * files live outside `src/` so `vue-tsc -p tsconfig.app.json` never
 * type-checks the `bun:test` imports.
 */
import { describe, expect, test } from 'bun:test'

import {
  toAdminIdentity,
  toAdminMember,
  toAdminOrg,
  toAdminOrgDetail,
  toAdminRoleOptions,
  toAdminSystemUser,
  toAuditEntry,
  toSystemUserUpdateRequest,
} from '../../src/features/system-admin/infrastructure/mappers'

const TENANT_DTO = {
  id: '018f0000-0000-7000-8000-000000000001',
  type: 'organization',
  name: 'EXAMPLE MCHJ',
  stir: '301234567',
  status: 'active',
  created_at: '2026-01-15T09:00:00Z',
}

const MEMBER_DTO = {
  user_id: '018f0000-0000-7000-8000-000000000002',
  role: 'owner',
  status: 'active',
  full_name: 'ALIYEV ALI',
  email_masked: 'a***@example.uz',
  phone_masked: '+998 90 *** 45 67',
  identity_status: 'verified',
}

const STAFF_DTO = {
  id: '018f0000-0000-7000-8000-000000000003',
  email: 'admin@example.com',
  display_name: 'SUPERADMIN',
  role: 'superadmin',
  status: 'active',
  totp_enrolled: true,
  created_at: '2026-01-10T08:00:00Z',
  updated_at: '2026-02-01T10:30:00Z',
}

describe('toAdminIdentity', () => {
  test('maps the live /system/auth/me shape to the identity', () => {
    const profile = toAdminIdentity({
      id: '018f0000-0000-7000-8000-000000000003',
      email: 'admin@example.com',
      display_name: 'SUPERADMIN',
      role: 'superadmin',
      language_code: 'en',
      permissions: ['system.users.read', 'audit.read'],
      totp_enrolled: true,
    })
    expect(profile?.uuid).toBe('018f0000-0000-7000-8000-000000000003')
    expect(profile?.email).toBe('admin@example.com')
    expect(profile?.roles).toEqual(['superadmin'])
    expect(profile?.permissions).toEqual(['system.users.read', 'audit.read'])
  })

  test('returns null when the body is missing', () => {
    expect(toAdminIdentity(undefined)).toBeNull()
  })
})

describe('toAdminOrg', () => {
  test('maps the tenant row, renaming tin→stir and isActive→status', () => {
    expect(toAdminOrg(TENANT_DTO)).toEqual({
      id: TENANT_DTO.id,
      type: 'organization',
      name: 'EXAMPLE MCHJ',
      stir: '301234567',
      status: 'active',
      createdAt: '2026-01-15T09:00:00Z',
    })
  })

  test('defaults the optional tax number and timestamp to empty placeholders', () => {
    const org = toAdminOrg({ id: 't-1', type: 'organization', name: 'X', status: 'suspended' })
    expect(org.stir).toBe('')
    expect(org.createdAt).toBeNull()
    expect(org.status).toBe('suspended')
  })
})

describe('toAdminOrgDetail', () => {
  test('maps the tenant row plus its aggregates', () => {
    const detail = toAdminOrgDetail({
      tenant: TENANT_DTO,
      member_count: 7,
      document_counts: [
        { status: 'active', count: 12 },
        { status: 'draft', count: 3 },
      ],
    })
    expect(detail.org.id).toBe(TENANT_DTO.id)
    expect(detail.memberCount).toBe(7)
    expect(detail.documentCounts).toEqual([
      { status: 'active', count: 12 },
      { status: 'draft', count: 3 },
    ])
  })
})

describe('toAdminMember', () => {
  test('maps the tenant-scoped member fields', () => {
    expect(toAdminMember(MEMBER_DTO)).toEqual({
      userId: MEMBER_DTO.user_id,
      role: 'owner',
      status: 'active',
      fullName: 'ALIYEV ALI',
      emailMasked: 'a***@example.uz',
      phoneMasked: '+998 90 *** 45 67',
      identityStatus: 'verified',
    })
  })

  test('nulls the masked contacts when the backend omits them', () => {
    const member = toAdminMember({
      user_id: 'm-1',
      role: 'owner',
      status: 'active',
      full_name: 'X',
      identity_status: 'verified',
    })
    expect(member.emailMasked).toBeNull()
    expect(member.phoneMasked).toBeNull()
  })
})

describe('toAdminSystemUser', () => {
  test('maps the staff account with its singular role', () => {
    expect(toAdminSystemUser(STAFF_DTO)).toEqual({
      id: STAFF_DTO.id,
      email: 'admin@example.com',
      displayName: 'SUPERADMIN',
      role: 'superadmin',
      status: 'active',
      totpEnrolled: true,
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-02-01T10:30:00Z',
    })
  })

  test('keeps a disabled account distinguishable from an active one', () => {
    expect(toAdminSystemUser({ ...STAFF_DTO, status: 'disabled' }).status).toBe('disabled')
  })
})

describe('toSystemUserUpdateRequest', () => {
  test('omits fields the patch does not touch', () => {
    expect(toSystemUserUpdateRequest({ role: 'operator' })).toEqual({ role: 'operator' })
    expect(toSystemUserUpdateRequest({ status: 'disabled' })).toEqual({ status: 'disabled' })
    expect(toSystemUserUpdateRequest({})).toEqual({})
  })

  test('maps the camelCase patch onto the snake_case body', () => {
    expect(
      toSystemUserUpdateRequest({ displayName: 'NEW NAME', role: 'operator', status: 'active' }),
    ).toEqual({ display_name: 'NEW NAME', role: 'operator', status: 'active' })
  })

  test('returns null for a value the contract does not allow', () => {
    expect(toSystemUserUpdateRequest({ role: 'system_admin' })).toBeNull()
    expect(toSystemUserUpdateRequest({ status: 'blocked' })).toBeNull()
  })
})

describe('toAdminRoleOptions', () => {
  test('maps the fixed catalogue into alphabetically stable role options', () => {
    const options = toAdminRoleOptions({
      permissions: ['audit.read', 'i18n.read'],
      roles: {
        superadmin: ['audit.read', 'i18n.read'],
        operator: ['audit.read'],
        i18n_editor: ['i18n.read'],
      },
    })
    expect(options.map((option) => option.role)).toEqual(['i18n_editor', 'operator', 'superadmin'])
    expect(options.find((option) => option.role === 'operator')?.permissions).toEqual(['audit.read'])
  })
})

describe('toAuditEntry', () => {
  test('maps the flat SYSTEM audit item', () => {
    const entry = toAuditEntry({
      id: '5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01',
      seq: 42,
      occurred_at: '2026-10-24T10:00:00Z',
      action: 'system.tenant.suspended',
      outcome: 'success',
      actor_user_id: '018f0000-0000-7000-8000-000000000003',
      actor_type: 'user',
      auth_method: 'password',
      cert_serial: null,
      resource_type: 'tenant',
      resource_id: '018f0000-0000-7000-8000-000000000001',
      details: { method: 'password' },
      ip: '203.0.113.7',
      request_id: '01a1cb3bdfc576409d48542f531f181e',
    })

    expect(entry.id).toBe('5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01')
    expect(entry.seq).toBe(42)
    expect(entry.occurredAt).toBe('2026-10-24T10:00:00Z')
    expect(entry.action).toBe('system.tenant.suspended')
    expect(entry.outcome).toBe('success')
    expect(entry.actorUserId).toBe('018f0000-0000-7000-8000-000000000003')
    expect(entry.actorType).toBe('user')
    expect(entry.authMethod).toBe('password')
    expect(entry.certSerial).toBeNull()
    expect(entry.resourceType).toBe('tenant')
    expect(entry.resourceId).toBe('018f0000-0000-7000-8000-000000000001')
    expect(entry.details).toEqual({ method: 'password' })
    expect(entry.ip).toBe('203.0.113.7')
    expect(entry.requestId).toBe('01a1cb3bdfc576409d48542f531f181e')
  })

  test('maps missing optionals to null so the UI shows the placeholder', () => {
    const entry = toAuditEntry({
      id: 'e-1',
      seq: 1,
      occurred_at: '2026-10-24T10:00:00Z',
      action: 'auth.sign_in',
      outcome: 'success',
      actor_type: 'system',
      details: {},
    })
    expect(entry.actorUserId).toBeNull()
    expect(entry.authMethod).toBeNull()
    expect(entry.certSerial).toBeNull()
    expect(entry.resourceType).toBeNull()
    expect(entry.resourceId).toBeNull()
    expect(entry.ip).toBeNull()
    expect(entry.requestId).toBeNull()
  })
})
