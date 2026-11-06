<script setup lang="ts" generic="T extends string">
import { ref, type ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MethodOption } from '../methods'

const props = defineProps<{
  modelValue: T
  options: readonly MethodOption<T>[]
  /** Translated accessible name for the tablist. */
  label: string
  /** Ids are prefixed so two selectors can coexist on one page. */
  idPrefix: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const { t } = useI18n()

// Roving tabindex: only the selected tab is in the tab order; arrows move both
// selection and focus (automatic activation).
const tabElements = ref<HTMLButtonElement[]>([])

const setTabRef = (el: Element | ComponentPublicInstance | null, index: number): void => {
  if (el instanceof HTMLButtonElement) tabElements.value[index] = el
}

const select = (method: T): void => {
  emit('update:modelValue', method)
}

const onKeydown = (event: KeyboardEvent, index: number): void => {
  const count = props.options.length
  let next: number
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = (index + 1) % count
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      next = (index - 1 + count) % count
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = count - 1
      break
    default:
      return
  }
  event.preventDefault()
  const option = props.options[next]
  if (option === undefined) return
  select(option.id)
  tabElements.value[next]?.focus()
}
</script>

<template>
  <div class="method-selector" role="tablist" :aria-label="label">
    <button
      v-for="(option, index) in options"
      :id="`${idPrefix}-tab-${option.id}`"
      :key="option.id"
      :ref="(el) => setTabRef(el, index)"
      type="button"
      role="tab"
      class="method-selector__tab"
      :class="{ 'method-selector__tab--active': modelValue === option.id }"
      :aria-selected="modelValue === option.id"
      :aria-controls="`${idPrefix}-panel-${option.id}`"
      :tabindex="modelValue === option.id ? 0 : -1"
      @click="select(option.id)"
      @keydown="onKeydown($event, index)"
    >
      {{ t(option.labelKey) }}
    </button>
  </div>
</template>

<style scoped>
.method-selector {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
}

.method-selector__tab {
  min-height: 2.75rem;
  padding: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

.method-selector__tab:hover {
  color: var(--color-text);
}

/* The active tab is marked by weight, background and border, not colour alone. */
.method-selector__tab--active {
  border-color: var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text);
}
</style>
