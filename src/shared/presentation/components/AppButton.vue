<script setup lang="ts">
import AppSpinner from './AppSpinner.vue'

withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'primary' | 'ghost'
    loading?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  { type: 'button', variant: 'primary', loading: false, disabled: false, block: false },
)
</script>

<template>
  <button
    :type="type"
    class="button"
    :class="[`button--${variant}`, { 'button--block': block }]"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <AppSpinner v-if="loading" :size="16" decorative />
    <span class="button__label"><slot /></span>
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.button--primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.button--ghost {
  background-color: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}

.button--ghost:hover:not(:disabled) {
  background-color: var(--color-bg);
}

.button--block {
  width: 100%;
}
</style>
