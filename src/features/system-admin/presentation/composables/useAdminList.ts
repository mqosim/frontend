import { computed, ref, shallowRef } from 'vue'

import type { AppError, Result } from '@/shared/domain'

import type { AdminListQuery, AdminPage } from '../../domain/adminQuery'

export type AdminListStatus = 'loading' | 'ready' | 'error'
export type AdminPageLoader<T> = (query: AdminListQuery) => Promise<Result<AdminPage<T>>>

/**
 * Search + offset paging shared by the admin list pages. The backend returns the
 * whole page plus `X-Total-Count`, so the pager is driven by the reported total,
 * not by a guessed "has more" flag.
 */
export const useAdminList = <T>(loadPage: AdminPageLoader<T>, pageSize = 20) => {
  const items = shallowRef<readonly T[]>([])
  const total = ref(0)
  const page = ref(1)
  const search = ref('')
  const appliedSearch = ref('')
  const status = ref<AdminListStatus>('loading')
  const error = shallowRef<AppError | null>(null)

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
  const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize + 1))
  const rangeEnd = computed(() => Math.min(page.value * pageSize, total.value))

  const load = async (): Promise<void> => {
    status.value = 'loading'
    error.value = null
    const result = await loadPage({
      search: appliedSearch.value === '' ? undefined : appliedSearch.value,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    })
    if (!result.ok) {
      status.value = 'error'
      error.value = result.error
      return
    }
    items.value = result.value.items
    total.value = result.value.total
    status.value = 'ready'
  }

  const submitSearch = (): void => {
    appliedSearch.value = search.value.trim()
    page.value = 1
    void load()
  }

  const clearSearch = (): void => {
    search.value = ''
    submitSearch()
  }

  const goToPage = (next: number): void => {
    const clamped = Math.min(Math.max(1, next), pageCount.value)
    if (clamped === page.value) return
    page.value = clamped
    void load()
  }

  const refresh = (): void => {
    void load()
  }

  return {
    items,
    total,
    page,
    pageCount,
    rangeStart,
    rangeEnd,
    search,
    appliedSearch,
    status,
    error,
    load,
    refresh,
    submitSearch,
    clearSearch,
    goToPage,
  }
}
