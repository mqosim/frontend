<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * The compact Settings form control from the Account Security design: a 35px
 * input on a 13px label, with an optional password-visibility toggle. The shared
 * `AppTextField` renders a taller, larger control, so this local variant keeps
 * the reference proportions without touching the shared component.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: 'text' | 'password'
    name?: string
    inputmode?: 'text' | 'email' | 'tel' | 'numeric'
    autocomplete?: string
    placeholder?: string
    error?: string
    disabled?: boolean
    /** Render the eye/eye-off toggle (password fields only). */
    toggleable?: boolean
  }>(),
  {
    type: 'text',
    name: undefined,
    inputmode: undefined,
    autocomplete: undefined,
    placeholder: undefined,
    error: '',
    disabled: false,
    toggleable: false,
  },
)

defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()

const { t } = useI18n()

const fieldId = useId()
const errorId = `${fieldId}-error`

const visible = ref(false)
const actualType = computed(() =>
  props.type === 'password' && visible.value ? 'text' : props.type,
)
</script>

<template>
  <div class="sfield">
    <label class="sfield__label" :for="fieldId">{{ label }}</label>
    <div class="sfield__box">
      <input
        :id="fieldId"
        class="sfield__input"
        :class="{
          'sfield__input--toggleable': toggleable,
          'sfield__input--invalid': Boolean(error),
        }"
        :value="modelValue"
        :type="actualType"
        :name="name"
        :inputmode="inputmode"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? errorId : undefined"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur')"
      />
      <button
        v-if="toggleable"
        type="button"
        class="sfield__toggle"
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
    <p v-if="error" :id="errorId" class="sfield__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.sfield {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sfield__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.sfield__box {
  position: relative;
}

.sfield__input {
  box-sizing: border-box;
  width: 100%;
  height: 35px;
  padding: 0 11px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  background-color: var(--color-surface);
  font: inherit;
  font-size: 13px;
  color: var(--color-text);
}

.sfield__input:disabled {
  opacity: 0.6;
}

/* Room for the visibility toggle so text never runs under it. */
.sfield__input--toggleable {
  padding-right: 38px;
}

.sfield__input--invalid {
  border-color: var(--color-danger);
}

.sfield__toggle {
  position: absolute;
  top: 50%;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.sfield__toggle svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sfield__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger);
}
</style>
