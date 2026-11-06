<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// Skeleton only: the active module's own sub-navigation will be rendered here
// later. Kept as a separate component so each module can supply its own content.
defineProps<{ title: string }>()

const { t } = useI18n()
</script>

<template>
  <aside class="subpanel" :aria-label="title">
    <h2 class="subpanel__title">{{ title }}</h2>

    <div class="subpanel__skeleton" aria-hidden="true">
      <span v-for="n in 4" :key="n" class="subpanel__bar"></span>
    </div>

    <p class="subpanel__hint">{{ t('org.subpanel_placeholder') }}</p>
  </aside>
</template>

<style scoped>
.subpanel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: var(--subpanel-width);
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4);
  background-color: var(--color-bg);
  border-right: 1px solid var(--color-border);
}

.subpanel__title {
  font-size: var(--font-size-md);
}

.subpanel__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.subpanel__bar {
  height: 1rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
}

.subpanel__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
