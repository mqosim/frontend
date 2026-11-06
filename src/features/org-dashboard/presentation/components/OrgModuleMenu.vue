<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import BrandLogo from '@/shared/presentation/components/BrandLogo.vue'
import ModuleIcon from '@/shared/presentation/components/ModuleIcon.vue'

import type { ModuleDefinition, ModuleId } from '../../domain/menu'

const props = defineProps<{
  modules: readonly ModuleDefinition[]
  activeId: ModuleId | null
  collapsed: boolean
  principalType: string
  /** Readable label for the active workspace (never the raw `oid`). */
  workspaceLabel: string
}>()

const emit = defineEmits<{ 'toggle-collapse': []; close: [] }>()

const { t } = useI18n()
const route = useRoute()

/** Org modules live on the module route; workspace-specific modules name their own. */
const moduleTarget = (module: ModuleDefinition): RouteLocationRaw =>
  module.to ?? { name: 'org-module', params: { module: module.id } }

// The wordmark opens the workspace's home: the first module's own target when it
// declares one (the personal Dashboard), otherwise the org shell default.
const brandTo = computed<RouteLocationRaw>(() => {
  const first = props.modules[0]
  return first?.to ?? { name: 'org' }
})
</script>

<template>
  <aside class="module-menu" :class="{ 'module-menu--collapsed': collapsed }">
    <div class="module-menu__header">
      <RouterLink class="module-menu__brand" :to="brandTo" aria-label="MFIN">
        <BrandLogo />
      </RouterLink>

      <div class="module-menu__actions">
        <button
          type="button"
          class="module-menu__icon-button module-menu__close"
          :aria-label="t('org.close_menu')"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6 6l12 12M18 6 6 18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <button
          type="button"
          class="module-menu__icon-button module-menu__collapse"
          :aria-label="t(collapsed ? 'org.expand_menu' : 'org.collapse_menu')"
          :title="t(collapsed ? 'org.expand_menu' : 'org.collapse_menu')"
          aria-controls="org-module-navigation"
          :aria-expanded="!collapsed"
          @click="emit('toggle-collapse')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
            <path :d="collapsed ? 'm14 9 3 3-3 3' : 'm16 9-3 3 3 3'" />
          </svg>
        </button>
      </div>
    </div>

    <nav id="org-module-navigation" class="module-menu__nav" :aria-label="t('org.menu_label')">
      <ul class="module-menu__list">
        <li v-for="module in modules" :key="module.id">
          <RouterLink
            class="module-menu__item"
            :class="{ 'module-menu__item--active': module.id === activeId }"
            :to="moduleTarget(module)"
            :aria-label="t(module.labelKey)"
            :aria-current="module.id === activeId ? 'page' : undefined"
            :title="collapsed ? t(module.labelKey) : undefined"
          >
            <ModuleIcon :id="module.id" />
            <span class="module-menu__label">{{ t(module.labelKey) }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="module-menu__footer">
      <dl class="module-menu__account">
        <dt>{{ t('org.principal') }}</dt>
        <dd>{{ principalType }}</dd>
        <dt>{{ t('org.workspace') }}</dt>
        <dd>{{ workspaceLabel }}</dd>
      </dl>

      <RouterLink
        class="module-menu__settings"
        :class="{ 'module-menu__settings--active': route.name === 'settings' }"
        :to="{ name: 'settings' }"
        :aria-label="t('action.settings')"
        :aria-current="route.name === 'settings' ? 'page' : undefined"
        :title="collapsed ? t('action.settings') : undefined"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
        <span class="module-menu__settings-label">{{ t('action.settings') }}</span>
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.module-menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: var(--menu-width);
  height: 100%;
  min-height: 0;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition: width 0.18s ease;
}

.module-menu__header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  height: 66px;
  padding: 0 var(--space-2) 0 28px;
  border-bottom: 1px solid var(--color-border);
}

.module-menu__brand {
  --brand-min-width: 4rem;

  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  color: var(--color-text);
  text-decoration: none;
}

.module-menu__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-1);
}

.module-menu__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--global-controls-height);
  height: var(--global-controls-height);
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.module-menu__icon-button:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.module-menu__icon-button svg {
  width: var(--icon-size);
  height: var(--icon-size);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* The collapse/expand toggle keeps the smaller action size; the drawer close
   button above stays at the module-icon size. */
.module-menu__collapse svg {
  width: var(--icon-size-action);
  height: var(--icon-size-action);
}

.module-menu__nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.module-menu__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0 var(--space-2);
  list-style: none;
}

.module-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--menu-item-height);
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  text-decoration: none;
}

.module-menu__item:hover {
  background-color: var(--color-bg);
}

/* The active module is marked by weight, background, border and aria-current,
   never by colour alone. */
.module-menu__item--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
  font-weight: 650;
}

.module-menu__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-menu__footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-top: 1px solid var(--color-border);
}

.module-menu__account {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-2);
  margin: 0;
  font-size: var(--font-size-sm);
}

.module-menu__account dt {
  color: var(--color-text-muted);
}

.module-menu__account dd {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-menu__settings {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--menu-item-height);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

/* The active Settings entry is marked by background and aria-current. */
.module-menu__settings--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.module-menu__settings:hover {
  background-color: var(--color-bg);
}

.module-menu__settings svg {
  width: var(--icon-size-action);
  height: var(--icon-size-action);
  flex-shrink: 0;
}

/* Collapsed (icon-only) state, desktop only: labels and the account block are
   hidden, items centre their icon and rely on `title`/`aria-label`. */
@media (min-width: 48.01rem) {
  .module-menu--collapsed {
    width: var(--menu-width-collapsed);
  }

  .module-menu--collapsed .module-menu__header {
    justify-content: center;
    padding: 0;
  }

  .module-menu--collapsed .module-menu__brand,
  .module-menu--collapsed .module-menu__label,
  .module-menu--collapsed .module-menu__settings-label,
  .module-menu--collapsed .module-menu__account {
    display: none;
  }

  .module-menu--collapsed .module-menu__item,
  .module-menu--collapsed .module-menu__settings {
    justify-content: center;
    padding: 0;
  }
}

/* The close button is only meaningful in the mobile drawer. */
.module-menu__close {
  display: none;
}

@media (max-width: 48rem) {
  .module-menu__close {
    display: inline-flex;
  }

  .module-menu__collapse {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .module-menu {
    transition: none;
  }
}
</style>
