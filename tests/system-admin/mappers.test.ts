/**
 * Unit tests for the admin DTO → entity mappers. They are the boundary where
 * snake_case/optional wire fields become the camelCase entities the UI trusts,
 * so missing fields must degrade to safe defaults rather than `undefined`.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 */
import { describe, expect, test } from 'bun:test'

import type { AppError } from '../../src/shared/domain'
import {
  adminActionErrorKey,
  adminLoadErrorKey,
} from '../../src/features/system-admin/presentation/adminErrors'
import {
  toAdminIdentity,
  toAdminOrg,
  toAdminRole,
  toAdminSystemUser,
  toAdminUser,
} from '../../src/features/system-admin/infrastructure/mappers'

describe('toAdminIdentity', () => {
  test('maps a full /admin/me body', () => {
    expect(
      toAdminIdentity({
        uuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
        email: 'admin@example.com',
        roles: ['system_admin'],
        permissions: ['system.user.read', 'system.role.manage'],
      }),
    ).toEqual({
      uuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
      email: 'admin@example.com',
      roles: ['system_admin'],
      permissions: ['system.user.read', 'system.role.manage'],
    })
  })

  test('a missing body maps to null', () => {
    expect(toAdminIdentity(undefined)).toBeNull()
  })

  test('missing roles/permissions default to empty arrays', () => {
    expect(toAdminIdentity({ uuid: 'u-1' })).toEqual({
      uuid: 'u-1',
      email: null,
      roles: [],
      permissions: [],
    })
  })
})

describe('toAdminOrg', () => {
  test('maps the wire fields', () => {
    expect(
      toAdminOrg({
        uuid: '5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01',
        tin: '123456789',
        name: 'Acme MCHJ',
        is_active: true,
        created_at: '2026-01-02T03:04:05Z',
        updated_at: '2026-02-03T04:05:06Z',
      }),
    ).toEqual({
      uuid: '5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01',
      tin: '123456789',
      name: 'Acme MCHJ',
      isActive: true,
      createdAt: '2026-01-02T03:04:05Z',
      updatedAt: '2026-02-03T04:05:06Z',
    })
  })

  test('defaults missing optional fields without throwing', () => {
    expect(toAdminOrg({})).toEqual({
      uuid: '',
      tin: '',
      name: '',
      isActive: false,
      createdAt: null,
      updatedAt: null,
    })
  })
})

describe('toAdminUser', () => {
  test('maps a PERSON account', () => {
    expect(
      toAdminUser({
        uuid: 'a1b2c3d4-e5f6-4789-a0bc-def012345678',
        user_type: 'PERSON',
        email: 'person@example.com',
        phone_number: '+998901234567',
        is_active: false,
        language_code: 'uz',
        email_verified_at: '2026-01-02T03:04:05Z',
        created_at: '2026-01-02T03:04:05Z',
        updated_at: '2026-02-03T04:05:06Z',
      }),
    ).toEqual({
      uuid: 'a1b2c3d4-e5f6-4789-a0bc-def012345678',
      userType: 'PERSON',
      email: 'person@example.com',
      phoneNumber: '+998901234567',
      isActive: false,
      languageCode: 'uz',
      emailVerifiedAt: '2026-01-02T03:04:05Z',
      createdAt: '2026-01-02T03:04:05Z',
      updatedAt: '2026-02-03T04:05:06Z',
    })
  })

  test('maps an ORG account', () => {
    expect(toAdminUser({ user_type: 'ORG' }).userType).toBe('ORG')
  })

  test('an unknown/missing type degrades to PERSON and defaults are safe', () => {
    expect(toAdminUser({}).userType).toBe('PERSON')
    expect(toAdminUser({}).email).toBeNull()
    expect(toAdminUser({}).phoneNumber).toBeNull()
    expect(toAdminUser({}).isActive).toBe(false)
    expect(toAdminUser({}).languageCode).toBe('')
  })
})

describe('toAdminSystemUser', () => {
  test('keeps the user fields and maps the role bundles', () => {
    const user = toAdminSystemUser({
      uuid: 'c3d4e5f6-a7b8-4901-bcd2-ef3456789abc',
      user_type: 'PERSON',
      email: 'operator@example.com',
      roles: ['system_admin', 'system_auditor'],
    })

    expect(user.uuid).toBe('c3d4e5f6-a7b8-4901-bcd2-ef3456789abc')
    expect(user.email).toBe('operator@example.com')
    expect(user.roles).toEqual(['system_admin', 'system_auditor'])
  })

  test('missing roles default to an empty array', () => {
    expect(toAdminSystemUser({}).roles).toEqual([])
  })
})

describe('toAdminRole', () => {
  test('maps a role and its permission codes', () => {
    expect(
      toAdminRole({
        code: 'system_support',
        description: 'Read access plus blocking',
        permissions: ['system.user.read', 'system.user.block'],
      }),
    ).toEqual({
      code: 'system_support',
      description: 'Read access plus blocking',
      permissions: ['system.user.read', 'system.user.block'],
    })
  })

  test('missing fields default safely', () => {
    expect(toAdminRole({})).toEqual({ code: '', description: '', permissions: [] })
  })
})

describe('admin error copy selection', () => {
  const error = (kind: AppError['kind']): AppError => ({ kind }) as AppError

  test('403/404/422/503 map to dedicated action messages', () => {
    expect(adminActionErrorKey(error('Forbidden'), 'block-user')).toBe(
      'system.action_error_forbidden',
    )
    expect(adminActionErrorKey(error('NotFound'), 'block-user')).toBe(
      'system.action_error_not_found',
    )
    expect(adminActionErrorKey(error('Unprocessable'), 'block-user')).toBe(
      'system.action_error_unprocessable',
    )
    expect(adminActionErrorKey(error('ServiceUnavailable'), 'block-user')).toBe(
      'system.action_error_unavailable',
    )
  })

  test('409 picks copy by action: self vs last administrator', () => {
    expect(adminActionErrorKey(error('Conflict'), 'block-system-user')).toBe(
      'system.action_error_self_or_last_admin',
    )
    expect(adminActionErrorKey(error('Conflict'), 'revoke-system-user-sessions')).toBe(
      'system.action_error_self',
    )
    expect(adminActionErrorKey(error('Conflict'), 'block-org')).toBe(
      'system.action_error_last_admin',
    )
    expect(adminActionErrorKey(error('Conflict'), 'block-user')).toBe(
      'system.action_error_last_admin',
    )
  })

  test('list/detail 403 has its own copy; other kinds fall back to shared errors', () => {
    expect(adminLoadErrorKey(error('Forbidden'))).toBe('system.admin_error_forbidden')
    expect(adminLoadErrorKey(error('Network'))).toBe('errors.network')
  })
})
