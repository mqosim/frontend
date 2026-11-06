<script setup lang="ts">
import AppSpinner from '@/shared/presentation/components/AppSpinner.vue'

/**
 * The Settings action button from the Account Security design: 35px tall, 12px
 * label, 7px radius. The shared `AppButton` is taller with a larger label, so
 * this local variant keeps the reference proportions without touching it.
 */
withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'primary' | 'secondary'
    loading?: boolean
    disabled?: boolean
  }>(),
  { type: 'button', variant: 'primary', loading: false, disabled: false },
)
</script>

<template>
  <button
    :type="type"
    class="sbtn"
    :class="`sbtn--${variant}`"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <AppSpinner v-if="loading" :size="14" decorative />
    <span class="sbtn__label"><slot /></span>
  </button>
</template>

<style scoped>
.sbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  box-sizing: border-box;
  min-width: 82px;
  height: 35px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 7px;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.sbtn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.sbtn--primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.sbtn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.sbtn--secondary {
  border-color: var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text);
}

.sbtn--secondary:hover:not(:disabled) {
  background-color: var(--color-bg);
}
</style>
