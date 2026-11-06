/**
 * Unit tests for the audit-log entry mapper and row key.
 *
 * Run with:
 *
 *   bun --tsconfig-override tsconfig.app.json test tests/
 *
 * The `--tsconfig-override` flag is required because the `@/` path alias is
 * declared in `tsconfig.app.json`, which bun does not read by default. The
 * file lives outside `src/` so `vue-tsc -p tsconfig.app.json` never type-checks
 * the `bun:test` imports.
 */
import { describe, expect, test } from 'bun:test'

import { auditRowKey } from '../../src/features/system-admin/domain/auditLog'
import { toEntry } from '../../src/features/system-admin/infrastructure/auditLogRepository'

describe('toEntry', () => {
  test('maps UUIDs and numeric ids when both are present', () => {
    const entry = toEntry({
      uuid: '5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01',
      occurred_at: '2026-10-24T10:00:00Z',
      actor_user_id: 7,
      actor_user_uuid: 'a1b2c3d4-e5f6-4789-a0bc-def012345678',
      actor_type: 'user',
      org_id: 42,
      org_uuid: 'c3d4e5f6-a7b8-4901-bcd2-ef3456789abc',
      action: 'auth.sign_in',
      details: { method: 'password' },
      ip: '203.0.113.7',
      user_agent: 'Mozilla/5.0',
    })

    expect(entry.uuid).toBe('5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01')
    expect(entry.actorUserUuid).toBe('a1b2c3d4-e5f6-4789-a0bc-def012345678')
    expect(entry.actorUserId).toBe(7)
    expect(entry.orgUuid).toBe('c3d4e5f6-a7b8-4901-bcd2-ef3456789abc')
    expect(entry.orgId).toBe(42)
    expect(entry.details).toEqual({ method: 'password' })
  })

  test('falls back to the numeric ids when the UUIDs are null (legacy rows)', () => {
    const entry = toEntry({
      actor_user_id: 7,
      actor_user_uuid: null,
      org_id: 42,
      org_uuid: null,
    })

    expect(entry.actorUserUuid).toBeNull()
    expect(entry.actorUserId).toBe(7)
    expect(entry.orgUuid).toBeNull()
    expect(entry.orgId).toBe(42)
  })

  test('maps missing identifiers to null so the UI shows the placeholder', () => {
    const entry = toEntry({})

    expect(entry.uuid).toBeNull()
    expect(entry.actorUserUuid).toBeNull()
    expect(entry.actorUserId).toBeNull()
    expect(entry.orgUuid).toBeNull()
    expect(entry.orgId).toBeNull()
    expect(entry.details).toBeUndefined()
  })
})

describe('auditRowKey', () => {
  test('prefers the entry UUID', () => {
    expect(auditRowKey({ uuid: '5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01' }, 3)).toBe(
      '5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01',
    )
  })

  test('falls back to the row index — there is no numeric `id` branch', () => {
    expect(auditRowKey({ uuid: null }, 4)).toBe('row-4')
  })
})
