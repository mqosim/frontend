/**
 * Paging contract for the offset-paged admin list endpoints
 * (`limit`/`offset` query parameters, `total` in the response body — the
 * retired `X-Total-Count` header is gone). Text search is not supported by the
 * backend; filtering over the loaded page happens client-side in the views.
 */
export interface AdminListQuery {
  readonly limit: number
  readonly offset: number
}

export interface AdminPage<T> {
  readonly items: readonly T[]
  readonly total: number
}
