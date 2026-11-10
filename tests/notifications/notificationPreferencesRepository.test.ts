/**
 * Unit tests for the notification-preferences repository.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * The settings page persists the interface language through this repository, so
 * these tests pin the path, the full-replacement PUT body, and the snake_case ->
 * camelCase mapping. Language-code translation (`uzc` <-> `uz-Cyrl`) is a
 * presentation concern handled with the public i18n helpers.
 */
import { describe, expect, test } from 'bun:test'

import { createNotificationPreferencesRepository } from '../../src/features/notifications/infrastructure/notificationPreferencesRepository'
import type { ApiClient } from '../../src/shared/infrastructure/api/client'

interface RecordedCall {
  readonly path: string
  readonly init?: { body?: unknown }
}

/** Minimal openapi-fetch call shape `toResult` consumes. */
type FakeCallResult = {
  readonly data?: unknown
  readonly error?: unknown
  readonly response: Response
}

const makeRepository = (client: Record<string, unknown>) =>
  createNotificationPreferencesRepository(client as unknown as ApiClient)

describe('notificationPreferencesRepository.getPreferences', () => {
  test('reads the preferences endpoint and maps the response to the domain shape', async () => {
    const calls: string[] = []
    const client = {
      async GET(path: string): Promise<FakeCallResult> {
        calls.push(path)
        return {
          data: { document_events: 'none', locale: 'uz-Cyrl' },
          response: new Response(null, { status: 200 }),
        }
      },
    }

    const result = await makeRepository(client).getPreferences()

    expect(calls).toEqual(['/api/v1/notifications/preferences'])
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`)
    expect(result.value).toEqual({ documentEvents: 'none', locale: 'uz-Cyrl' })
  })

  test('keeps a null locale as null (no explicit saved language)', async () => {
    const client = {
      async GET(): Promise<FakeCallResult> {
        return {
          data: { document_events: 'all', locale: null },
          response: new Response(null, { status: 200 }),
        }
      },
    }

    const result = await makeRepository(client).getPreferences()

    if (!result.ok) throw new Error('expected ok')
    expect(result.value.locale).toBeNull()
  })
})

describe('notificationPreferencesRepository.updatePreferences', () => {
  test('PUTs the full replacement, including document_events and the locale', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async PUT(path: string, init?: { body?: unknown }): Promise<FakeCallResult> {
        calls.push({ path, init })
        return {
          data: { document_events: 'important', locale: 'uz-Cyrl' },
          response: new Response(null, { status: 200 }),
        }
      },
    }

    const result = await makeRepository(client).updatePreferences({
      documentEvents: 'important',
      locale: 'uz-Cyrl',
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/v1/notifications/preferences')
    expect(calls[0]?.init?.body).toEqual({
      document_events: 'important',
      locale: 'uz-Cyrl',
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value).toEqual({ documentEvents: 'important', locale: 'uz-Cyrl' })
  })

  test('surfaces failures instead of pretending the language was saved', async () => {
    const calls: RecordedCall[] = []
    const client = {
      async PUT(path: string, init?: { body?: unknown }): Promise<FakeCallResult> {
        calls.push({ path, init })
        return { error: {}, response: new Response(null, { status: 400 }) }
      },
    }

    const result = await makeRepository(client).updatePreferences({
      documentEvents: 'all',
      locale: 'ru',
    })

    expect(calls[0]?.path).toBe('/api/v1/notifications/preferences')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected the 400 to surface as an error')
    expect(result.error).toEqual({ kind: 'Validation', status: 400, fields: {} })
  })
})
