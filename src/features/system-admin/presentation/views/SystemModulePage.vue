<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { findSystemModule } from '../../application/menu'
import SystemAuditLogsPage from '../components/SystemAuditLogsPage.vue'

const props = defineProps<{ moduleId: string }>()

const { t } = useI18n()

// `beforeEnter` guarantees a valid id; the null branch is only a safety net.
const module = computed(() => findSystemModule(props.moduleId))
</script>

<template>
  <template v-if="module">
    <SystemAuditLogsPage v-if="module.id === 'audit'" />
    <section v-else class="module-page">
      <h1 class="module-page__title">{{ t(module.labelKey) }}</h1>
      <p class="module-page__text">{{ t('system.page_placeholder') }}</p>
    </section>
  </template>
</template>

<style scoped>
.module-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: var(--content-max-width-wide);
  padding-top: var(--space-5);
}

.module-page__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.module-page__text {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
