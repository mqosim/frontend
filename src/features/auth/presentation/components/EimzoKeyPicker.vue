<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import AppSpinner from '@/shared/presentation/components/AppSpinner.vue'

import type { EimzoKey } from '../../domain/entities'
import { useEimzoKeys } from '../composables/useEimzoKeys'

const props = withDefaults(
  defineProps<{
    modelValue: EimzoKey | null
    /** Unique radio-group name, so two pickers can coexist on one page. */
    name: string
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: EimzoKey | null] }>()

const { t } = useI18n()
const { keys, status, errorKey, reload } = useEimzoKeys()

// Bound by id so the radio group compares primitives, not key objects.
const selectedId = computed<string>({
  get: () => props.modelValue?.id ?? '',
  set: (id) => {
    emit('update:modelValue', keys.value.find((key) => key.id === id) ?? null)
  },
})

// Certificate dates are display-only; the server re-validates the signature.
const formatDate = (iso: string | null): string =>
  iso === null ? '' : new Date(iso).toLocaleDateString()

// Reloads on every mount, so re-showing the E-IMZO tab picks up keys added or
// removed since the panel was last shown.
onMounted(() => {
  void reload()
})
</script>

<template>
  <div class="key-picker">
    <div v-if="status === 'loading'" class="key-picker__state">
      <AppSpinner :label="t('auth.eimzo_loading')" />
      <p class="key-picker__muted">{{ t('auth.eimzo_loading') }}</p>
    </div>

    <template v-else-if="status === 'error'">
      <AppAlert variant="error">{{ t(errorKey) }}</AppAlert>
      <AppButton type="button" variant="ghost" :disabled="disabled" @click="reload">
        {{ t('auth.eimzo_refresh') }}
      </AppButton>
    </template>

    <template v-else-if="status === 'empty'">
      <p class="key-picker__muted">{{ t('auth.eimzo_empty') }}</p>
      <AppButton type="button" variant="ghost" :disabled="disabled" @click="reload">
        {{ t('auth.eimzo_refresh') }}
      </AppButton>
    </template>

    <template v-else>
      <fieldset class="key-picker__keys" :disabled="disabled">
        <legend class="key-picker__legend">{{ t('auth.eimzo_select') }}</legend>

        <label v-for="key in keys" :key="key.id" class="key-picker__key">
          <input v-model="selectedId" type="radio" :name="name" :value="key.id" />
          <span class="key-picker__key-body">
            <span class="key-picker__key-subject">{{ key.subject }}</span>
            <span class="key-picker__key-meta">
              {{ t('auth.eimzo_key_serial') }}: {{ key.serialNumber }}
              <template v-if="key.validTo">
                · {{ t('auth.eimzo_key_valid_until') }} {{ formatDate(key.validTo) }}
              </template>
            </span>
          </span>
        </label>
      </fieldset>

      <AppButton type="button" variant="ghost" :disabled="disabled" @click="reload">
        {{ t('auth.eimzo_refresh') }}
      </AppButton>

      <!-- The owning panel supplies its submit button; it only exists once keys
           are selectable, matching the previous single-panel behaviour. -->
      <slot />
    </template>
  </div>
</template>

<style scoped>
.key-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.key-picker__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
}

.key-picker__muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.key-picker__keys {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 16rem;
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow-y: auto;
}

.key-picker__legend {
  padding: 0 var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.key-picker__key {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  cursor: pointer;
}

.key-picker__key-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.key-picker__key-subject {
  font-weight: 600;
}

.key-picker__key-meta {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
