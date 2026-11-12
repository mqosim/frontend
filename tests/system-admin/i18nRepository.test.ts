/**
 * Unit tests for the SYSTEM i18n endpoints in the admin repository: the exact
 * paths, path/query parameters and request bodies, and the mapped results.
 * Every request must stay inside the new FastAPI contract (`/system/i18n/*`).
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 */
import { describe, expect, test } from 'bun:test'

import { createAdminRepository } from '../../src/features/system-admin/infrastructure/adminRepository'
import type { ApiClient } from '../../src/shared/infrastructure/api/client'

interface RecordedCall {
  readonly method: string
  readonly path: string
  readonly init?: {
    params?: { path?: Record<string, string>; query?: Record<string, unknown> }
    body?: unknown
  }
}

type FakeCallResult = {
  readonly data?: unknown
  readonly error?: unknown
  readonly response: Response
}

const okJson = (data: unknown): FakeCallResult => ({
  data,
  response: new Response(null, { status: 200 }),
})

const okEmpty = (): FakeCallResult => ({ response: new Response(null, { status: 204 }) })

const makeClient = (handler: (call: RecordedCall) => FakeCallResult) => {
  const calls: RecordedCall[] = []
  const method =
    (name: string) =>
    async (path: string, init?: RecordedCall['init']): Promise<FakeCallResult> => {
      const call = { method: name, path, init }
      calls.push(call)
      return handler(call)
    }
  return {
    calls,
    client: {
      GET: method('GET'),
      POST: method('POST'),
      PATCH: method('PATCH'),
      PUT: method('PUT'),
      DELETE: method('DELETE'),
    } as unknown as ApiClient,
  }
}

const LANGUAGE_DTO = {
  code: 'ru',
  name: 'Russian',
  native_name: 'Русский',
  script: 'Cyrl',
  is_active: true,
  is_default: false,
  sort_order: 3,
}

const PAGE_DTO = { key: 'system.admin', description: 'Admin', is_active: true, phrase_count: 9 }

describe('i18n language endpoints', () => {
  test('list GETs /system/i18n/languages and maps the rows', async () => {
    const { calls, client } = makeClient(() => okJson({ items: [LANGUAGE_DTO] }))
    const repository = createAdminRepository({ client })

    const result = await repository.listI18nLanguages()

    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/languages')
    if (!result.ok) throw new Error('expected ok')
    expect(result.value).toEqual([
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        script: 'Cyrl',
        isActive: true,
        isDefault: false,
        sortOrder: 3,
      },
    ])
  })

  test('update PATCHes the code path with only the changed flag', async () => {
    const { calls, client } = makeClient(() => okJson({ ...LANGUAGE_DTO, is_active: false }))
    const repository = createAdminRepository({ client })

    const result = await repository.updateI18nLanguage('ru', { isActive: false })

    expect(calls[0]?.method).toBe('PATCH')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/languages/{code}')
    expect(calls[0]?.init?.params?.path).toEqual({ code: 'ru' })
    expect(calls[0]?.init?.body).toEqual({ is_active: false })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.isActive).toBe(false)
  })
})

describe('i18n page endpoints', () => {
  test('list GETs /system/i18n/pages', async () => {
    const { calls, client } = makeClient(() => okJson({ items: [PAGE_DTO] }))
    const repository = createAdminRepository({ client })

    const result = await repository.listI18nPages()

    expect(calls[0]?.path).toBe('/api/v1/system/i18n/pages')
    if (!result.ok) throw new Error('expected ok')
    expect(result.value[0]).toEqual({
      key: 'system.admin',
      description: 'Admin',
      isActive: true,
      phraseCount: 9,
    })
  })

  test('create POSTs the page body and maps the created page', async () => {
    const { calls, client } = makeClient(() =>
      okJson({ key: 'billing.invoices', description: null, is_active: true, phrase_count: 0 }),
    )
    const repository = createAdminRepository({ client })

    const result = await repository.createI18nPage({ key: 'billing.invoices', isActive: true })

    expect(calls[0]?.method).toBe('POST')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/pages')
    expect(calls[0]?.init?.body).toEqual({ key: 'billing.invoices', is_active: true })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.description).toBeNull()
  })

  test('update PATCHes by page key', async () => {
    const { calls, client } = makeClient(() => okJson({ ...PAGE_DTO, is_active: false }))
    const repository = createAdminRepository({ client })

    const result = await repository.updateI18nPage('system.admin', { isActive: false })

    expect(calls[0]?.method).toBe('PATCH')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/pages/{page_key}')
    expect(calls[0]?.init?.params?.path).toEqual({ page_key: 'system.admin' })
    expect(calls[0]?.init?.body).toEqual({ is_active: false })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.isActive).toBe(false)
  })

  test('delete DELETEs by page key and reports success for the 204', async () => {
    const { calls, client } = makeClient(() => okEmpty())
    const repository = createAdminRepository({ client })

    const result = await repository.deleteI18nPage('billing.invoices')

    expect(calls[0]?.method).toBe('DELETE')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/pages/{page_key}')
    expect(calls[0]?.init?.params?.path).toEqual({ page_key: 'billing.invoices' })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value).toBeUndefined()
  })
})

describe('i18n phrase endpoints', () => {
  test('list GETs the page slice with its cursor and maps next_cursor', async () => {
    const { calls, client } = makeClient(() =>
      okJson({
        items: [
          {
            page_key: 'system.admin',
            phrase_key: 'system.nav_audit',
            values: { en: 'Audit logs' },
          },
        ],
        next_cursor: 'system.nav_audit',
      }),
    )
    const repository = createAdminRepository({ client })

    const result = await repository.listI18nPhrases('system.admin', { limit: 50 })

    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/phrases')
    expect(calls[0]?.init?.params?.query).toEqual({ page: 'system.admin', limit: 50 })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.nextCursor).toBe('system.nav_audit')
    expect(result.value.items[0]?.phraseKey).toBe('system.nav_audit')
  })

  test('list forwards the cursor when paging', async () => {
    const { calls, client } = makeClient(() => okJson({ items: [], next_cursor: null }))
    const repository = createAdminRepository({ client })

    const result = await repository.listI18nPhrases('system.admin', {
      limit: 50,
      cursor: 'system.nav_audit',
    })

    expect(calls[0]?.init?.params?.query).toEqual({
      page: 'system.admin',
      limit: 50,
      cursor: 'system.nav_audit',
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.nextCursor).toBeNull()
  })

  test('upsert PUTs both keys with the values body', async () => {
    const { calls, client } = makeClient(() =>
      okJson({
        page_key: 'system.admin',
        phrase_key: 'system.nav_audit',
        values: { en: 'Audit logs' },
      }),
    )
    const repository = createAdminRepository({ client })

    const result = await repository.upsertI18nPhrase('system.admin', 'system.nav_audit', {
      en: 'Audit logs',
    })

    expect(calls[0]?.method).toBe('PUT')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/phrases/{page_key}/{phrase_key}')
    expect(calls[0]?.init?.params?.path).toEqual({
      page_key: 'system.admin',
      phrase_key: 'system.nav_audit',
    })
    expect(calls[0]?.init?.body).toEqual({ values: { en: 'Audit logs' } })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.values).toEqual({ en: 'Audit logs' })
  })

  test('delete DELETEs both keys', async () => {
    const { calls, client } = makeClient(() => okEmpty())
    const repository = createAdminRepository({ client })

    const result = await repository.deleteI18nPhrase('system.admin', 'system.nav_audit')

    expect(calls[0]?.method).toBe('DELETE')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/phrases/{page_key}/{phrase_key}')
    expect(calls[0]?.init?.params?.path).toEqual({
      page_key: 'system.admin',
      phrase_key: 'system.nav_audit',
    })
    if (!result.ok) throw new Error('expected ok')
  })
})

describe('i18n missing report and import', () => {
  test('missing GETs the report and maps the per-page counts', async () => {
    const { calls, client } = makeClient(() =>
      okJson({ items: [{ code: 'ru', total: 2, pages: { 'system.admin': 2 } }] }),
    )
    const repository = createAdminRepository({ client })

    const result = await repository.getI18nMissing()

    expect(calls[0]?.path).toBe('/api/v1/system/i18n/missing')
    if (!result.ok) throw new Error('expected ok')
    expect(result.value).toEqual([{ code: 'ru', total: 2, pages: { 'system.admin': 2 } }])
  })

  test('import POSTs the mapped body and the report', async () => {
    const { calls, client } = makeClient(() =>
      okJson({
        pages_created: 0,
        phrases_created: 0,
        inserted: 0,
        updated: 0,
        unchanged: 1,
        conflicts: [],
        per_language: { en: 0 },
        missing_per_language: { en: 0 },
        dry_run: true,
        revision: 12,
      }),
    )
    const repository = createAdminRepository({ client })

    const result = await repository.importI18n({
      pages: null,
      phrases: { 'system.admin': { 'system.nav_audit': { en: 'Audit logs' } } },
      overwrite: false,
      dryRun: true,
    })

    expect(calls[0]?.method).toBe('POST')
    expect(calls[0]?.path).toBe('/api/v1/system/i18n/import')
    expect(calls[0]?.init?.body).toEqual({
      pages: null,
      phrases: { 'system.admin': { 'system.nav_audit': { en: 'Audit logs' } } },
      overwrite: false,
      dry_run: true,
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.value.dryRun).toBe(true)
    expect(result.value.revision).toBe(12)
  })

  test('a 403 surfaces as a Forbidden error with its machine code', async () => {
    const { client } = makeClient(() => ({
      error: { error: { code: 'system_permission_denied', message: 'denied' } },
      response: new Response(null, { status: 403 }),
    }))
    const repository = createAdminRepository({ client })

    const result = await repository.getI18nMissing()

    if (result.ok) throw new Error('expected an error')
    expect(result.error.kind).toBe('Forbidden')
    expect(result.error).toMatchObject({ code: 'system_permission_denied' })
  })
})
