<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { findModule } from '../../application/menu'
import DashboardPage from '../components/DashboardPage.vue'

const props = defineProps<{ moduleId: string }>()

const { t } = useI18n()

// `beforeEnter` guarantees a valid id; the null branch is only a safety net.
const module = computed(() => findModule(props.moduleId))
</script>

<template>
  <template v-if="module">
    <DashboardPage v-if="module.id === 'dashboard'" />
    <section v-else class="module-page">
      <h1 class="module-page__title">{{ t(module.labelKey) }}</h1>
      <p class="module-page__text">{{ t('org.page_placeholder') }}</p>
    </section>
  </template>
</template>

<style scoped>
.module-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: var(--content-max-width-wide);
}

.module-page__title {
  font-size: var(--font-size-xl);
}

.module-page__text {
  color: var(--color-text-muted);
}
</style>
