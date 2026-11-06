<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppSpinner from '@/shared/presentation/components/AppSpinner.vue'

const { t } = useI18n()
</script>

<template>
  <div class="splash" role="status" aria-live="polite">
    <AppSpinner :size="28" :label="t('common.restoring')" />
    <p class="splash__text">{{ t('common.restoring') }}</p>
  </div>
</template>

<style scoped>
.splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 100%;
  color: var(--color-text-muted);
}

.splash__text {
  font-size: var(--font-size-sm);
}
</style>
