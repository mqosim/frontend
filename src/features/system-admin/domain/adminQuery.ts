/**
 * Paging contract shared by the admin list endpoints. `search` is optional and
 * matches the backend's free-text search; `limit`/`offset` map to the same query
 * parameters. `total` comes from the `X-Total-Count` response header.
 */
export interface AdminListQuery {
  readonly search?: string
  readonly limit: number
  readonly offset: number
}

export interface AdminPage<T> {
  readonly items: readonly T[]
  readonly total: number
}
