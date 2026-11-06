<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppButton from '@/shared/presentation/components/AppButton.vue'

defineProps<{
  page: number
  pageCount: number
  rangeStart: number
  rangeEnd: number
  total: number
}>()

const emit = defineEmits<{ prev: []; next: [] }>()

const { t } = useI18n()
</script>

<template>
  <nav class="admin-pagination" :aria-label="t('system.admin_pagination')">
    <p class="admin-pagination__range">
      {{ t('system.admin_range', { start: rangeStart, end: rangeEnd, total }) }}
    </p>
    <div class="admin-pagination__controls">
      <AppButton variant="ghost" :disabled="page <= 1" @click="emit('prev')">
        {{ t('system.admin_prev_page') }}
      </AppButton>
      <span class="admin-pagination__page">
        {{ t('system.admin_page_status', { page, pages: pageCount }) }}
      </span>
      <AppButton variant="ghost" :disabled="page >= pageCount" @click="emit('next')">
        {{ t('system.admin_next_page') }}
      </AppButton>
    </div>
  </nav>
</template>

<style scoped>
.admin-pagination {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}

.admin-pagination__range,
.admin-pagination__page {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}

.admin-pagination__controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
</style>
