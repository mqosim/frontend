<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useAuthSessionStore, useWorkspaceLabel } from '@/features/auth'
import { workspaceOf } from '@/shared/presentation/navigation/dashboardRoute'

import { findModule, getModuleMenu } from '../../application/menu'
import { useModuleMenu } from '../composables/useModuleMenu'
import OrgModuleMenu from './OrgModuleMenu.vue'
import OrgModuleSubPanel from './OrgModuleSubPanel.vue'

const { t } = useI18n()
const route = useRoute()
const session = useAuthSessionStore()
const { collapsed, toggle } = useModuleMenu()

const modules = computed(() => getModuleMenu(workspaceOf(session.principal)))

// A module is active only while its own `/org/:module` route is shown, so the
// sub-panel skeleton never appears on unrelated pages that reuse this shell
// (for example `/settings`).
const activeId = computed(() => {
  const value = route.params.module
  if (typeof value === 'string') return findModule(value)?.id ?? null
  // The personal workspace's Dashboard lives on `/app/home` (no module param);
  // its menu item shares the org dashboard's id.
  if (route.name === 'app-home') return 'dashboard'
  return null
})
const activeModule = computed(() => (activeId.value === null ? null : findModule(activeId.value)))
// The Dashboard has no sub-navigation; its content spans the full width, while
// every other module keeps the sub-panel.
const hasSubPanel = computed(
  () =>
    activeModule.value !== null &&
    activeModule.value.id !== 'dashboard' &&
    modules.value.length > 0,
)

const principalType = computed(() => session.principalType ?? '—')
// A readable label for the active workspace (org name/TIN or "Personal"), never
// the raw `oid`.
const workspaceLabel = useWorkspaceLabel()

// Mobile drawer. It is one instance of the menu, revealed by CSS; the drawer
// closes on navigation, on Escape and on the close button.
const drawerOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') drawerOpen.value = false
}

watch(drawerOpen, (open) => {
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="org-shell"
    :class="{
      'org-shell--drawer-open': drawerOpen,
      'org-shell--with-panel': hasSubPanel,
    }"
  >
    <button
      type="button"
      class="org-shell__menu-button"
      :aria-label="t('org.open_menu')"
      :aria-expanded="drawerOpen"
      aria-controls="org-module-menu"
      @click="drawerOpen = true"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4 7h16M4 12h16M4 17h16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <div v-if="drawerOpen" class="org-shell__scrim" @click="drawerOpen = false"></div>

    <div class="org-shell__header">
      <slot name="header" />
    </div>

    <OrgModuleMenu
      id="org-module-menu"
      class="org-shell__menu"
      :modules="modules"
      :active-id="activeId"
      :collapsed="collapsed"
      :principal-type="principalType"
      :workspace-label="workspaceLabel"
      @toggle-collapse="toggle"
      @close="drawerOpen = false"
    />

    <OrgModuleSubPanel
      v-if="hasSubPanel && activeModule"
      class="org-shell__panel"
      :title="t(activeModule.labelKey)"
    />

    <main id="main" tabindex="-1" class="org-shell__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.org-shell {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  overflow: hidden;
}

/* The sidebar spans both rows. The shared header occupies the top of the
   content columns, so the wordmark and collapse control can live together in
   the sidebar without duplicating either one. */
.org-shell__menu {
  grid-column: 1;
  grid-row: 1 / 3;
}

.org-shell__header {
  grid-column: 2 / 4;
  grid-row: 1;
  min-width: 0;
}

.org-shell__panel {
  grid-column: 2;
  grid-row: 2;
}

.org-shell__content {
  grid-column: 2 / 4;
  grid-row: 2;
}

.org-shell--with-panel .org-shell__content {
  grid-column: 3;
}

.org-shell__content {
  min-height: 0;
  overflow-y: auto;
  padding-inline: var(--space-5);
  padding-bottom: var(--space-5);
}

/* Pages declare their own max-width; auto margins center them in the
   remaining space, so the layout adapts to the sidebar's width without
   JavaScript. Full-width pages are unaffected. */
.org-shell__content > * {
  margin-inline: auto;
}

.org-shell__menu-button {
  display: none;
  position: fixed;
  top: var(--global-controls-top);
  left: calc(var(--space-4) + env(safe-area-inset-left, 0px));
  z-index: var(--z-controls);
  align-items: center;
  justify-content: center;
  width: var(--menu-button-size);
  height: var(--menu-button-size);
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.org-shell__menu-button svg {
  width: var(--icon-size);
  height: var(--icon-size);
}

.org-shell__scrim {
  display: none;
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-drawer) - 1);
  background-color: var(--color-scrim);
}

/* ── Mobile: the menu becomes a drawer, the sub-panel is hidden ─────────── */
@media (max-width: 48rem) {
  .org-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .org-shell__header,
  .org-shell__content,
  .org-shell--with-panel .org-shell__content {
    grid-column: 1;
  }

  .org-shell__header {
    grid-row: 1;
  }

  .org-shell__content {
    grid-row: 2;
  }

  .org-shell__menu-button {
    display: inline-flex;
  }

  .org-shell__scrim {
    display: block;
  }

  /* The sub-panel is a desktop affordance; on mobile the content takes the
     whole width and the menu lives in the drawer. */
  .org-shell__panel {
    display: none;
  }

  .org-shell__menu {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: var(--z-drawer);
    width: min(var(--menu-width), 80vw);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .org-shell--drawer-open .org-shell__menu {
    transform: translateX(0);
  }
}
</style>
