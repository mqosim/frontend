<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { ADMIN_PERMISSIONS } from '../../domain/permissions'
import AdminPage from '../components/AdminPage.vue'
import SystemI18nImport from '../components/i18n/SystemI18nImport.vue'
import SystemI18nLanguages from '../components/i18n/SystemI18nLanguages.vue'
import SystemI18nMissing from '../components/i18n/SystemI18nMissing.vue'
import SystemI18nPages from '../components/i18n/SystemI18nPages.vue'
import SystemI18nPhrases from '../components/i18n/SystemI18nPhrases.vue'
import { usePermissions } from '../composables/usePermissions'

type TabId = 'languages' | 'pages' | 'phrases' | 'missing' | 'import'

/**
 * The i18n catalog management area. `i18n.read` opens the page; every mutation
 * inside the sections is gated by `i18n.manage` (the import tab itself is
 * manage-only). Sections only render controls the caller can actually use, and
 * the backend enforces each request.
 */
const { t } = useI18n()
const { can } = usePermissions()

const canManage = computed(() => can(ADMIN_PERMISSIONS.i18nManage))

const tabs = computed<readonly TabId[]>(() =>
  canManage.value
    ? ['languages', 'pages', 'phrases', 'missing', 'import']
    : ['languages', 'pages', 'phrases', 'missing'],
)

const active = ref<TabId>('languages')

// A permission change (or a direct visit by a read-only caller) must never
// leave the manage-only import tab selected.
watch(
  canManage,
  (manage) => {
    if (!manage && active.value === 'import') active.value = 'languages'
  },
  { immediate: true },
)
</script>

<template>
  <AdminPage :title="t('system.i18n_title')" :subtitle="t('system.i18n_subtitle')" wide>
    <p v-if="!canManage" class="i18n-read-only">{{ t('system.i18n_read_only') }}</p>

    <div class="i18n-tabs" role="tablist" :aria-label="t('system.i18n_title')">
      <button
        v-for="tab in tabs"
        :id="`i18n-tab-${tab}`"
        :key="tab"
        type="button"
        role="tab"
        class="i18n-tab"
        :class="{ 'i18n-tab--active': active === tab }"
        :aria-selected="active === tab"
        :aria-controls="`i18n-panel-${tab}`"
        @click="active = tab"
      >
        {{ t(`system.i18n_tab_${tab}`) }}
      </button>
    </div>

    <div
      :id="`i18n-panel-${active}`"
      class="i18n-panel"
      role="tabpanel"
      :aria-labelledby="`i18n-tab-${active}`"
    >
      <SystemI18nLanguages v-if="active === 'languages'" />
      <SystemI18nPages v-else-if="active === 'pages'" />
      <SystemI18nPhrases v-else-if="active === 'phrases'" />
      <SystemI18nMissing v-else-if="active === 'missing'" />
      <SystemI18nImport v-else-if="active === 'import' && canManage" />
    </div>
  </AdminPage>
</template>

<style scoped>
.i18n-read-only {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.i18n-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.i18n-tab {
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.i18n-tab:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.i18n-tab--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
  font-weight: 600;
}

.i18n-tab:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.i18n-panel {
  min-width: 0;
}
</style>
