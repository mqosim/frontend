<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Password field with an inline eye/eye-off visibility toggle, styled to match
 * the shared `AppTextField` so it pairs with sibling fields in a form (login,
 * system login). The input is masked by default; the toggle only flips the
 * input `type`, never the value.
 */
withDefaults(
  defineProps<{
    modelValue: string
    label: string
    autocomplete?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    autocomplete: undefined,
    hint: '',
    error: '',
    required: false,
    disabled: false,
  },
)

defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()

const { t } = useI18n()

const fieldId = useId()
const errorId = `${fieldId}-error`
const hintId = `${fieldId}-hint`

// Masked by default; the toggle only flips the input `type`, never the value.
const visible = ref(false)
const actualType = computed(() => (visible.value ? 'text' : 'password'))
</script>

<template>
  <div class="field">
    <label class="field__label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <div class="field__box">
      <input
        :id="fieldId"
        class="field__input field__input--toggleable"
        :class="{ 'field__input--invalid': Boolean(error) }"
        :value="modelValue"
        :type="actualType"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :aria-required="required ? 'true' : undefined"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? errorId : hint ? hintId : undefined"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur')"
      />
      <button
        type="button"
        class="field__toggle"
        :aria-label="visible ? t('settings.hide_password') : t('settings.show_password')"
        :aria-pressed="visible"
        :disabled="disabled"
        @click="visible = !visible"
      >
        <svg v-if="visible" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <path d="m2 2 20 20" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
    <p v-if="hint && !error" :id="hintId" class="field__hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
/* Mirrors AppTextField so this field matches the sibling fields in a form. */
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

.field__box {
  position: relative;
  display: flex;
  flex-direction: column;
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

/* Room for the visibility toggle so text never runs under it. */
.field__input--toggleable {
  padding-right: calc(var(--space-3) + 1.75rem);
}

.field__toggle {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.field__toggle:disabled {
  cursor: default;
  opacity: 0.6;
}

.field__toggle svg {
  width: var(--icon-size-action);
  height: var(--icon-size-action);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.field__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.field__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
