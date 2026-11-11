/**
 * Unit tests for the SYSTEM audit-log repository: the cursor-paginated list
 * call, its window/filter parameters and the entry mapping.
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

import { createAuditLogRepository } from '../../src/features/system-admin/infrastructure/auditLogRepository'
import type { ApiClient } from '../../src/shared/infrastructure/api/client'

interface RecordedCall {
  readonly path: string
  readonly init?: { params?: { query?: Record<string, unknown> } }
}

/** Minimal openapi-fetch call shape `toResult` consumes. */
type FakeCallResult = {
  readonly data?: unknown
  readonly error?: unknown
  readonly response: Response
}

const makeRepository = (client: Record<string, unknown>) =>
  createAuditLogRepository({ client: client as unknown as ApiClient })

const ENTRY_DTO = {
  id: '5e8f2a1c-9b3d-4e7f-8a2b-1c3d5e7f9a01',
  seq: 42,
  occurred_at: '2026-10-24T10:00:00Z',
  action: 'system.tenant.suspended',
  outcome: 'success',
  actor_user_id: '018f0000-0000-7000-8000-000000000003',
  actor_type: 'user',
  details: { method: 'password' },
}

describe('auditLogRepository.list', () => {
  test('GETs the SYSTEM audit endpoint and maps the cursor page', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async GET(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return {
          data: { items: [ENTRY_DTO], next_cursor: 43 },
          response: new Response(null, { status: 200 }),
        }
      },
    }
    const repository = makeRepository(client)

    const result = await repository.list({
      limit: 25,
      cursor: 42,
      occurredFrom: '2026-10-24T09:00:00Z',
      occurredTo: '2026-10-24T10:00:00Z',
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/v1/system/audit/entries')
    expect(calls[0]?.init?.params?.query).toEqual({
      limit: 25,
      cursor: 42,
      occurred_from: '2026-10-24T09:00:00Z',
      occurred_to: '2026-10-24T10:00:00Z',
    })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.nextCursor).toBe(43)
    expect(result.value.items).toHaveLength(1)
    expect(result.value.items[0]?.id).toBe(ENTRY_DTO.id)
    expect(result.value.items[0]?.seq).toBe(42)
  })

  test('omits the cursor and window parameters when the query has none', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async GET(path: string, init?: RecordedCall['init']): Promise<FakeCallResult> {
        calls.push({ path, init })
        return {
          data: { items: [], next_cursor: null },
          response: new Response(null, { status: 200 }),
        }
      },
    }
    const repository = makeRepository(client)

    const result = await repository.list({ limit: 25 })

    expect(calls[0]?.init?.params?.query).toEqual({ limit: 25 })
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value.nextCursor).toBeNull()
    expect(result.value.items).toEqual([])
  })

  test('surfaces the error envelope untouched (machine code preserved)', async () => {
    const client = {
      async GET(): Promise<FakeCallResult> {
        return {
          error: { error: { code: 'system_permission_denied', message: 'developer-facing text' } },
          response: new Response(null, { status: 403 }),
        }
      },
    }
    const repository = makeRepository(client)

    const result = await repository.list({ limit: 25 })

    if (result.ok) throw new Error('expected the 403 to surface as an error')
    expect(result.error.kind).toBe('Forbidden')
    expect(result.error).toMatchObject({ code: 'system_permission_denied' })
  })
})
