import type { EimzoClientGlobal } from './eimzoTypes'

// The Base64 helper must load before the client, which uses it to encode the
// challenge in `create_pkcs7`.
const BASE64_SCRIPT = 'e-imzo/e-imzo.js'
const CLIENT_SCRIPT = 'e-imzo/e-imzo-client.js'

const injectScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })

let pending: Promise<EimzoClientGlobal> | null = null

/**
 * Loads the vendored E-IMZO client once, on demand (only when the E-IMZO
 * method is opened, never at app start). Failures are not cached, so the
 * panel's "refresh" can retry.
 */
export const loadEimzoClient = (baseUrl: string): Promise<EimzoClientGlobal> => {
  if (pending !== null) return pending

  const attempt = (async (): Promise<EimzoClientGlobal> => {
    await injectScript(`${baseUrl}${BASE64_SCRIPT}`)
    await injectScript(`${baseUrl}${CLIENT_SCRIPT}`)
    const client = window.EIMZOClient
    if (client === undefined) throw new Error('E-IMZO client did not initialise')
    return client
  })()

  pending = attempt
  void attempt.catch(() => {
    pending = null
  })
  return attempt
}
