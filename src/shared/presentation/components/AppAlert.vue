<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'error' | 'warning' | 'info'
  }>(),
  { variant: 'error' },
)

// Interrupt only for problems the user must act on; informational (and any
// future success) variants announce politely instead of interrupting.
const role = computed(() =>
  props.variant === 'error' || props.variant === 'warning' ? 'alert' : 'status',
)
</script>

<template>
  <p class="alert" :class="`alert--${variant}`" :role="role">
    <slot />
  </p>
</template>

<style scoped>
.alert {
  padding: var(--space-3) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.alert--error {
  color: var(--color-danger);
  background-color: var(--color-danger-surface);
  border-color: var(--color-danger);
}

.alert--warning {
  color: var(--color-warning);
  background-color: var(--color-warning-surface);
  border-color: var(--color-warning);
}

.alert--info {
  color: var(--color-info);
  background-color: var(--color-info-surface);
  border-color: var(--color-info);
}
</style>
