/**
 * Guard for the translation seed contract.
 *
 * Every i18n key the UI requests through `t()` must exist in
 * `docs/phrases-to-seed.json` (the seed input the backend's phrase seeder
 * consumes) with a non-empty value for all four locales, and in the embedded
 * English `fallbackMessages.ts`, so the UI never renders a raw key while the
 * database is unseeded or a fetch fails.
 *
 * Run with:
 *
 *   bun --tsconfig-override tsconfig.app.json test tests/
 *
 * The file lives outside `src/` so `vue-tsc -p tsconfig.app.json` never
 * type-checks the `bun:test` imports.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'bun:test'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const read = (path: string): string => readFileSync(repoRoot + path, 'utf-8')

interface PhraseEntry {
  uz: string
  uzc: string
  ru: string
  en: string
}

const docs = JSON.parse(read('docs/phrases-to-seed.json')) as Record<
  string,
  Record<string, PhraseEntry>
>
const docKeys = new Map(
  Object.entries(docs).flatMap(([page, group]) => Object.keys(group).map((k) => [k, page])),
)

const LOCALES = ['uz', 'uzc', 'ru', 'en'] as const

/** Dotted lowercase identifiers that are page slugs or permission ids, not phrase keys. */
const NON_KEYS = new Set([
  'auth.login',
  'auth.register',
  'auth.workspace',
  'system.admin',
  'system.login',
  'settings.profile',
])

/** Key namespaces the UI translates through (page groups plus cross-page prefixes). */
const NAMESPACES = new Set([
  'system',
  'common',
  'errors',
  'action',
  'auth',
  'home',
  'dashboard',
  'org',
  'settings',
  'notifications',
  'landing',
  'a11y',
  'validation',
])

const KEY_LITERAL = /['"]([a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)+)['"]/g
/** `t(...)` including ternaries and named params, one level of nesting deep. */
const T_CALL = /\bt\(((?:[^()]|\([^()]*\))*)\)/g
const LABEL_KEY = /labelKey:\s*['"]([a-z0-9_.]+)['"]/g

/** Files that return i18n keys from mappings instead of calling `t()` directly. */
const KEY_MAP_FILES = [
  'src/features/system-admin/presentation/adminErrors.ts',
  'src/features/system-auth/presentation/systemAuthErrors.ts',
  'src/shared/presentation/errors/messages.ts',
]

const walkSources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return walkSources(path)
    return /\.tsx?$|\.vue$/.test(entry.name) ? [path] : []
  })

/** Keys referenced by a source file: `t()` arguments, `labelKey`, key mappings. */
const usedKeys = (relativePath: string, source: string): string[] => {
  const found: string[] = []
  const push = (key: string | undefined): void => {
    if (key === undefined) return
    const [ns] = key.split('.')
    if (NAMESPACES.has(ns) && !NON_KEYS.has(key)) found.push(key)
  }
  if (KEY_MAP_FILES.includes(relativePath)) {
    for (const match of source.matchAll(KEY_LITERAL)) push(match[1])
  }
  for (const call of source.matchAll(T_CALL)) {
    for (const match of call[1].matchAll(KEY_LITERAL)) push(match[1])
  }
  for (const match of source.matchAll(LABEL_KEY)) push(match[1])
  return found
}

const sourceKeys = new Map(
  walkSources(repoRoot + 'src').map((path) => {
    const relative = path.slice(repoRoot.length)
    return [relative, usedKeys(relative, read(relative))] as const
  }),
)

/** `  'key': 'value',` — prettier wraps long values onto the next line (either quote style). */
const FB_ENTRY = /^ {2}'([^']+)':[ \t]*(?:\n {4})?(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'),$/gm

const unquote = (single: string | undefined, double: string | undefined): string =>
  (single ?? double ?? '').replace(/\\(['"])/g, '$1')

const fallbackMessages = new Map(
  [...read('src/features/i18n/presentation/fallbackMessages.ts').matchAll(FB_ENTRY)].map((m) => [
    m[1],
    unquote(m[2], m[3]),
  ]),
)

const PLACEHOLDER = /\{([a-z_]+)\}/g

describe('docs/phrases-to-seed.json', () => {
  test('has no duplicate phrase keys', () => {
    const raw = read('docs/phrases-to-seed.json')
    const seen = new Set<string>()
    const duplicated: string[] = []
    for (const match of raw.matchAll(/^ {4}"([a-z0-9_.-]+)": \{$/gm)) {
      if (seen.has(match[1])) duplicated.push(match[1])
      seen.add(match[1])
    }
    expect(duplicated).toEqual([])
    expect(seen.size).toBe(docKeys.size)
  })

  test('every phrase has a non-empty value for all four locales', () => {
    const incomplete: string[] = []
    for (const [page, group] of Object.entries(docs)) {
      for (const [key, value] of Object.entries(group)) {
        const locales = Object.keys(value).sort()
        expect(locales).toEqual([...LOCALES].sort())
        if (LOCALES.some((l) => typeof value[l] !== 'string' || value[l].trim() === '')) {
          incomplete.push(`${page}:${key}`)
        }
      }
    }
    expect(incomplete).toEqual([])
  })

  test('every phrase keeps its placeholders identical across locales', () => {
    const drifted: string[] = []
    for (const [key, value] of Object.entries(docs).flatMap(([, group]) => Object.entries(group))) {
      const sets = LOCALES.map((l) => [...value[l].matchAll(PLACEHOLDER)].map((m) => m[1]).sort())
      if (new Set(sets.map((s) => s.join(','))).size > 1) drifted.push(key)
    }
    expect(drifted).toEqual([])
  })
})

describe('i18n keys used in src/', () => {
  test('all exist in docs/phrases-to-seed.json with all locales', () => {
    const missing = [...sourceKeys.entries()].flatMap(([file, keys]) =>
      keys.filter((key) => !docKeys.has(key)).map((key) => `${file}: ${key}`),
    )
    expect(missing).toEqual([])
  })

  test('all exist in the embedded English fallbackMessages.ts', () => {
    const missing = [...sourceKeys.entries()].flatMap(([file, keys]) =>
      keys.filter((key) => !fallbackMessages.has(key)).map((key) => `${file}: ${key}`),
    )
    expect(missing).toEqual([])
  })

  test('fallbackMessages.ts never drifts from the seed (keys and English values)', () => {
    const unknown = [...fallbackMessages.keys()].filter((key) => !docKeys.has(key))
    expect(unknown).toEqual([])
    const drifted = [...fallbackMessages.entries()].flatMap(([key, en]) => {
      const page = docKeys.get(key)
      if (page === undefined) return []
      return docs[page][key].en === en
        ? []
        : [`${key}: fallback "${en}" != seed "${docs[page][key].en}"`]
    })
    expect(drifted).toEqual([])
  })
})
