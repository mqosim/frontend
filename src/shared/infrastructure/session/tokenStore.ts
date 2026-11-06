/**
 * Holds a context's access token **in memory only**. It is deliberately never
 * written to `localStorage` or `sessionStorage`, so an XSS cannot read a
 * persisted credential and a page reload restores the session through the
 * matching refresh endpoint instead.
 */
export interface TokenStore {
  get(): string | null
  set(token: string): void
  clear(): void
}

export const createTokenStore = (): TokenStore => {
  let token: string | null = null
  return {
    get: () => token,
    set: (next) => {
      token = next
    },
    clear: () => {
      token = null
    },
  }
}
