<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

import BrandLogo from '@/shared/presentation/components/BrandLogo.vue'
import ModuleIcon from '@/shared/presentation/components/ModuleIcon.vue'

import { SYSTEM_MENU } from '../../application/menu'
import type { SystemNavDefinition } from '../../domain/menu'
import { usePermissions } from '../composables/usePermissions'

defineProps<{
  activeId: string | null
  collapsed: boolean
  principalType: string
}>()

const emit = defineEmits<{ 'toggle-collapse': []; close: [] }>()

const { t } = useI18n()
const route = useRoute()
const { can, canAny } = usePermissions()

// UX-only gating: entries whose permission the caller lacks are hidden (an entry
// without a permission is always shown). The server remains the authority.
const menuItems = computed(() =>
  SYSTEM_MENU.filter(
    (item) =>
      (item.permission === undefined || can(item.permission)) &&
      (item.permissions === undefined || canAny(item.permissions)),
  ),
)

/** Modules live on the module route; the Dashboard names its own route. */
const itemTarget = (item: SystemNavDefinition): RouteLocationRaw =>
  item.to ?? { name: 'system-module', params: { module: item.id } }
</script>

<template>
  <aside class="system-menu" :class="{ 'system-menu--collapsed': collapsed }">
    <div class="system-menu__header">
      <RouterLink class="system-menu__brand" :to="{ name: 'system-dashboard' }" aria-label="MFIN">
        <BrandLogo />
      </RouterLink>

      <div class="system-menu__actions">
        <button
          type="button"
          class="system-menu__icon-button system-menu__close"
          :aria-label="t('system.close_menu')"
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
          class="system-menu__icon-button system-menu__collapse"
          :aria-label="t(collapsed ? 'system.expand_menu' : 'system.collapse_menu')"
          :title="t(collapsed ? 'system.expand_menu' : 'system.collapse_menu')"
          aria-controls="system-navigation"
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

    <nav id="system-navigation" class="system-menu__nav" :aria-label="t('system.menu_label')">
      <ul class="system-menu__list">
        <li v-for="item in menuItems" :key="item.id">
          <RouterLink
            class="system-menu__item"
            :class="{ 'system-menu__item--active': item.id === activeId }"
            :to="itemTarget(item)"
            :aria-label="t(item.labelKey)"
            :aria-current="item.id === activeId ? 'page' : undefined"
            :title="collapsed ? t(item.labelKey) : undefined"
          >
            <ModuleIcon :id="item.id" />
            <span class="system-menu__label">{{ t(item.labelKey) }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="system-menu__footer">
      <dl class="system-menu__account">
        <dt>{{ t('system.principal') }}</dt>
        <dd>{{ principalType }}</dd>
      </dl>

      <span class="system-menu__badge">{{ t('system.badge') }}</span>

      <RouterLink
        class="system-menu__settings"
        :class="{ 'system-menu__settings--active': route.name === 'system-settings' }"
        :to="{ name: 'system-settings' }"
        :aria-label="t('action.settings')"
        :aria-current="route.name === 'system-settings' ? 'page' : undefined"
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
        <span class="system-menu__settings-label">{{ t('action.settings') }}</span>
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.system-menu {
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

.system-menu__header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  height: 66px;
  padding: 0 var(--space-2) 0 28px;
  border-bottom: 1px solid var(--color-border);
}

.system-menu__brand {
  --brand-min-width: 4rem;

  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  color: var(--color-text);
  text-decoration: none;
}

.system-menu__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-1);
}

.system-menu__icon-button {
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

.system-menu__icon-button:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.system-menu__icon-button svg {
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
.system-menu__collapse svg {
  width: var(--icon-size-action);
  height: var(--icon-size-action);
}

.system-menu__nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.system-menu__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0 var(--space-2);
  list-style: none;
}

.system-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--menu-item-height);
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  text-decoration: none;
}

.system-menu__item:hover {
  background-color: var(--color-bg);
}

/* The active module is marked by weight, background, border and aria-current,
   never by colour alone. */
.system-menu__item--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
  font-weight: 650;
}

.system-menu__label {
  /* Long translations wrap onto a second line instead of being clipped: the
     item's min-height keeps single-line rows unchanged and lets wrapped rows
     grow; the icon stays centred next to the label. */
  min-width: 0;
  overflow-wrap: break-word;
  white-space: normal;
  line-height: 1.25;
}

.system-menu__footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-top: 1px solid var(--color-border);
}

.system-menu__account {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-2);
  margin: 0;
  font-size: var(--font-size-sm);
}

.system-menu__account dt {
  color: var(--color-text-muted);
}

.system-menu__account dd {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-menu__badge {
  align-self: flex-start;
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
}

.system-menu__settings {
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
.system-menu__settings--active {
  background-color: var(--color-info-surface);
  color: var(--color-info);
}

.system-menu__settings:hover {
  background-color: var(--color-bg);
}

.system-menu__settings svg {
  width: var(--icon-size-action);
  height: var(--icon-size-action);
  flex-shrink: 0;
}

/* Collapsed (icon-only) state, desktop only: labels, the account block and the
   badge are hidden; items centre their icon and rely on `title`/`aria-label`. */
@media (min-width: 48.01rem) {
  .system-menu--collapsed {
    width: var(--menu-width-collapsed);
  }

  .system-menu--collapsed .system-menu__header {
    justify-content: center;
    padding: 0;
  }

  .system-menu--collapsed .system-menu__brand,
  .system-menu--collapsed .system-menu__label,
  .system-menu--collapsed .system-menu__settings-label,
  .system-menu--collapsed .system-menu__account,
  .system-menu--collapsed .system-menu__badge {
    display: none;
  }

  .system-menu--collapsed .system-menu__item,
  .system-menu--collapsed .system-menu__settings {
    justify-content: center;
    padding: 0;
  }
}

/* The close button is only meaningful in the mobile drawer. */
.system-menu__close {
  display: none;
}

@media (max-width: 48rem) {
  .system-menu__close {
    display: inline-flex;
  }

  .system-menu__collapse {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .system-menu {
    transition: none;
  }
}
</style>
