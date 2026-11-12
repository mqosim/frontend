<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useModuleMenu } from '@/features/org-dashboard'
import { useSystemSessionStore } from '@/features/system-auth'
import AppButton from '@/shared/presentation/components/AppButton.vue'

import { findSystemModule } from '../../application/menu'
import { useAdminIdentity } from '../composables/useAdminIdentity'
import SystemSidebar from './SystemSidebar.vue'

const { t } = useI18n()
const route = useRoute()
const systemSession = useSystemSessionStore()
const { collapsed, toggle } = useModuleMenu()
const { status: adminStatus, load: reloadAdmin, loading: adminLoading } = useAdminIdentity()

// A failed `/system/auth/me` never ends the session: the shell still renders, gated
// menu items stay hidden (empty grants), and this notice offers a retry.
const adminLoadFailed = computed(() => adminStatus.value === 'error')

// The collapse preference is shared with the org menu's storage key, so the
// guard's fresh-sign-in reset expands this menu the same way.
const principalType = computed(() => systemSession.principalType ?? '—')

// A module is active only while its own `/system/:module` route is shown, so
// unrelated pages never light up a nav item.
const activeId = computed(() => {
  // List/detail routes declare their module explicitly; the module route keeps
  // deriving it from the `:module` parameter.
  if (typeof route.meta.systemModule === 'string') return route.meta.systemModule
  const value = route.params.module
  if (typeof value === 'string') return findSystemModule(value)?.id ?? null
  if (route.name === 'system-dashboard') return 'dashboard'
  return null
})

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
  <div class="system-shell" :class="{ 'system-shell--drawer-open': drawerOpen }">
    <button
      type="button"
      class="system-shell__menu-button"
      :aria-label="t('system.open_menu')"
      :aria-expanded="drawerOpen"
      aria-controls="system-menu"
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

    <div v-if="drawerOpen" class="system-shell__scrim" @click="drawerOpen = false"></div>

    <SystemSidebar
      id="system-menu"
      class="system-shell__menu"
      :active-id="activeId"
      :collapsed="collapsed"
      :principal-type="principalType"
      @toggle-collapse="toggle"
      @close="drawerOpen = false"
    />

    <div class="system-shell__header">
      <slot name="header" />
    </div>

    <main id="main" tabindex="-1" class="system-shell__content">
      <div v-if="adminLoadFailed" class="system-shell__notice" role="alert">
        <span>{{ t('system.admin_me_error') }}</span>
        <AppButton variant="ghost" :loading="adminLoading" @click="reloadAdmin">
          {{ t('system.admin_retry') }}
        </AppButton>
      </div>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.system-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  overflow: hidden;
}

/* The sidebar spans both rows. The header occupies the top of the content
   column, so the wordmark row and the header bottom-border line up. */
.system-shell__menu {
  grid-column: 1;
  grid-row: 1 / 3;
}

.system-shell__header {
  display: flex;
  grid-column: 2;
  grid-row: 1;
  align-items: center;
  justify-content: flex-end;
  height: 66px;
  min-width: 0;
  /* Language and theme live in the SYSTEM Settings page, so the fixed root
     control pair renders nothing here and no width is reserved for it. */
  padding-right: calc(var(--space-4) + env(safe-area-inset-right, 0px));
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.system-shell__content {
  grid-column: 2;
  grid-row: 2;
  min-height: 0;
  overflow-y: auto;
  padding-inline: var(--space-5);
  padding-bottom: var(--space-5);
}

/* Pages declare their own max-width; auto margins center them in the
   remaining space, so the layout adapts to the sidebar's width without
   JavaScript. */
.system-shell__content > * {
  margin-inline: auto;
}

.system-shell__notice {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  max-width: var(--content-max-width-wide);
  margin-block: var(--space-4) 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background-color: var(--color-danger-surface);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.system-shell__menu-button {
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

.system-shell__menu-button svg {
  width: var(--icon-size);
  height: var(--icon-size);
}

.system-shell__scrim {
  display: none;
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-drawer) - 1);
  background-color: var(--color-scrim);
}

/* ── Mobile: the menu becomes a drawer ───────────────────────────────────── */
@media (max-width: 48rem) {
  .system-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .system-shell__header,
  .system-shell__content {
    grid-column: 1;
  }

  .system-shell__header {
    grid-row: 1;
  }

  .system-shell__content {
    grid-row: 2;
  }

  .system-shell__menu-button {
    display: inline-flex;
  }

  .system-shell__scrim {
    display: block;
  }

  .system-shell__menu {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: var(--z-drawer);
    width: min(var(--menu-width), 80vw);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .system-shell--drawer-open .system-shell__menu {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .system-shell__menu {
    transition: none;
  }
}
</style>
