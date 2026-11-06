<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useTheme } from '../theme/useTheme'

const { t } = useI18n()
const { theme, toggle } = useTheme()

// The label names the action, so screen readers announce where the toggle leads.
const label = computed(() =>
  t(theme.value === 'dark' ? 'theme.switch_to_light' : 'theme.switch_to_dark'),
)
</script>

<template>
  <button type="button" class="theme-toggle" :aria-label="label" :title="label" @click="toggle">
    <svg
      v-if="theme === 'dark'"
      class="theme-toggle__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      class="theme-toggle__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--global-controls-height);
  height: var(--global-controls-height);
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.theme-toggle:hover {
  background-color: var(--color-bg);
}

.theme-toggle__icon {
  display: block;
}
</style>
