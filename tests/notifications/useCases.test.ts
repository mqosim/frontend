/**
 * Unit tests for the notification-preferences use case that persists the
 * interface language.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * `PUT /api/v1/notifications/preferences` is a full replacement, so saving a
 * language must first GET the current preferences and carry `document_events`
 * over unchanged. A failed GET must abort without writing anything.
 */
import { describe, expect, test } from 'bun:test'

import { createNotificationsUseCases } from '../../src/features/notifications/application/useCases'
import type { NotificationPreferences } from '../../src/features/notifications/domain/entities'
import type {
  NotificationPreferencesRepository,
  UpdatePreferencesInput,
} from '../../src/features/notifications/domain/ports'
import { err, ok } from '../../src/shared/domain'

const preferences: NotificationPreferences = {
  documentEvents: 'important',
  locale: 'ru',
}

const makeUseCases = (repository: NotificationPreferencesRepository) =>
  createNotificationsUseCases({ repository })

describe('notifications.saveLocale', () => {
  test('GETs the current preferences, then PUTs the language with document_events preserved', async () => {
    const updates: UpdatePreferencesInput[] = []
    let gets = 0
    const repository: NotificationPreferencesRepository = {
      async getPreferences() {
        gets += 1
        return ok(preferences)
      },
      async updatePreferences(input) {
        updates.push(input)
        return ok({ documentEvents: input.documentEvents, locale: input.locale })
      },
    }

    const result = await makeUseCases(repository).saveLocale('uz-Cyrl')

    expect(gets).toBe(1)
    expect(updates).toEqual([{ documentEvents: 'important', locale: 'uz-Cyrl' }])
    if (!result.ok) throw new Error('expected ok')
    expect(result.value).toEqual({ documentEvents: 'important', locale: 'uz-Cyrl' })
  })

  test('does not PUT when the GET fails', async () => {
    let updates = 0
    const failure = err({ kind: 'Network', status: null } as const)
    const repository: NotificationPreferencesRepository = {
      async getPreferences() {
        return failure
      },
      async updatePreferences() {
        updates += 1
        return ok(preferences)
      },
    }

    const result = await makeUseCases(repository).saveLocale('uz-Cyrl')

    expect(updates).toBe(0)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected the GET failure to propagate')
    expect(result.error).toEqual(failure.error)
  })

  test('surfaces a failed PUT without inventing a saved locale', async () => {
    const repository: NotificationPreferencesRepository = {
      async getPreferences() {
        return ok(preferences)
      },
      async updatePreferences() {
        return err({ kind: 'Unknown', status: 500 } as const)
      },
    }

    const result = await makeUseCases(repository).saveLocale('uz-Cyrl')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected the PUT failure to propagate')
    expect(result.error).toEqual({ kind: 'Unknown', status: 500 })
  })
})
