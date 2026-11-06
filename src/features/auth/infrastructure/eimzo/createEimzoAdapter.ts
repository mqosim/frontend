import type { EimzoAuthAdapter } from '../../domain/ports'
import { RealEimzoAdapter } from './RealEimzoAdapter'

export interface EimzoAdapterConfig {
  /** App base URL (Vite `base`) used to resolve the vendored E-IMZO scripts. */
  readonly baseUrl: string
}

/**
 * Builds the E-IMZO adapter.
 *
 * The mock branch is guarded by an inline `import.meta.env.DEV` expression (not
 * a helper — a helper would hide the constant from the bundler) and loads the
 * mock through a dynamic import. In a production build DEV is inlined as
 * `false`, so Rollup eliminates the branch, the loader and the mock module.
 */
export const createEimzoAdapter = (config: EimzoAdapterConfig): EimzoAuthAdapter => {
  if (import.meta.env.DEV && import.meta.env.VITE_EIMZO_MOCK === 'true') {
    return createLazyMockAdapter(import.meta.env.VITE_EIMZO_MOCK_PKCS7 ?? 'test_mock')
  }
  return new RealEimzoAdapter(config)
}

const createLazyMockAdapter = (pkcs7: string): EimzoAuthAdapter => {
  const load = async () => {
    const { MockEimzoAdapter } = await import('./MockEimzoAdapter')
    return new MockEimzoAdapter(pkcs7)
  }
  return {
    kind: 'mock',
    async listKeys() {
      return (await load()).listKeys()
    },
    async sign(challenge, key) {
      return (await load()).sign(challenge, key)
    },
  }
}
