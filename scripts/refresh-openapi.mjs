// Refreshes the committed copy of the backend OpenAPI document (openapi/openapi.json).
//
// Usage:
//   bun run api:refresh            # try the dev server, else the local backend repo
//   bun run api:refresh <url>      # fetch from a URL (e.g. http://localhost:8080/swagger/openapi.json)
//   bun run api:refresh <path>     # read a file from disk
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUTPUT = resolve(import.meta.dirname, '../openapi/openapi.json')
const DEV_URL = 'http://localhost:8080/swagger/openapi.json'
// The frontend repo is expected to sit next to the backend repo.
const BACKEND_FILE = resolve(
  import.meta.dirname,
  '../../backend/internal/platform/swagger/openapi.json',
)

const isUrl = (value) => /^https?:\/\//i.test(value)

const fromUrl = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`)
  return response.text()
}

const readSource = async () => {
  const arg = process.argv[2]
  if (arg) {
    return isUrl(arg)
      ? { text: await fromUrl(arg), origin: arg }
      : { text: readFileSync(arg, 'utf8'), origin: arg }
  }
  try {
    return { text: await fromUrl(DEV_URL), origin: DEV_URL }
  } catch {
    return { text: readFileSync(BACKEND_FILE, 'utf8'), origin: BACKEND_FILE }
  }
}

const { text, origin } = await readSource()
const spec = JSON.parse(text) // fail fast on a malformed document

// Deterministic serialization so a refresh produces a stable, reviewable diff.
writeFileSync(OUTPUT, `${JSON.stringify(spec, null, 2)}\n`)
console.log(`Wrote ${OUTPUT}\nfrom ${origin}`)
