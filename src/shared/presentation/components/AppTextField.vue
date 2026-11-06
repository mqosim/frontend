<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: string
    name?: string
    inputmode?: 'text' | 'email' | 'tel' | 'numeric'
    autocomplete?: string
    placeholder?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    type: 'text',
    name: undefined,
    inputmode: undefined,
    autocomplete: undefined,
    placeholder: undefined,
    hint: '',
    error: '',
    required: false,
    disabled: false,
  },
)

defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()

const fieldId = useId()
const errorId = `${fieldId}-error`
const hintId = `${fieldId}-hint`
</script>

<template>
  <div class="field">
    <label class="field__label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <input
      :id="fieldId"
      class="field__input"
      :class="{ 'field__input--invalid': Boolean(error) }"
      :value="modelValue"
      :type="type"
      :name="name"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :aria-required="required ? 'true' : undefined"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? errorId : hint ? hintId : undefined"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
    />
    <p v-if="hint && !error" :id="hintId" class="field__hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field__label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}

.field__required {
  color: var(--color-danger);
}

.field__input {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  color: var(--color-text);
  background-color: var(--color-surface);
}

.field__input:disabled {
  opacity: 0.6;
}

.field__input--invalid {
  border-color: var(--color-danger);
}

.field__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.field__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}
</style>
