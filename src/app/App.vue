<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useAuthSessionStore, useWorkspaceSwitch, WorkspaceSwitchDialog } from '@/features/auth'
import { useSystemSessionStore } from '@/features/system-auth'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'
import IdleWarningDialog from '@/shared/presentation/components/IdleWarningDialog.vue'
import SessionNotice from '@/shared/presentation/components/SessionNotice.vue'
import { useConfirmLogout } from '@/shared/presentation/composables/useConfirmLogout'

import SplashScreen from './components/SplashScreen.vue'
import GlobalControls from './components/GlobalControls.vue'
import AuthLayout from './layouts/AuthLayout.vue'
import AuthenticatedLayout from './layouts/AuthenticatedLayout.vue'
import LandingLayout from './layouts/LandingLayout.vue'
import PublicLayout from './layouts/PublicLayout.vue'
import SystemLayout from './layouts/SystemLayout.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authSession = useAuthSessionStore()
const systemSession = useSystemSessionStore()
const {
  open: logoutOpen,
  loggingOut,
  confirm: confirmLogout,
  cancel: cancelLogout,
} = useConfirmLogout()
const { open: workspaceSwitchOpen, close: closeWorkspaceSwitch } = useWorkspaceSwitch()

// The initial navigation is what triggers the context bootstrap (refresh); the
// splash covers the window before the first route is resolved.
const ready = ref(false)
onMounted(() => {
  void router.isReady().then(() => {
    ready.value = true
  })
})

const showSplash = computed(
  () => !ready.value || authSession.isRestoring || systemSession.isRestoring,
)
const layout = computed(() => {
  switch (route.meta.layout) {
    // The personal workspace shares the authenticated organization shell; the
    // shell's workspace-aware menu and header give it the same chrome.
    case 'person':
    case 'org':
    case 'settings':
      return AuthenticatedLayout
    case 'system':
      return SystemLayout
    case 'public':
      return PublicLayout
    case 'landing':
      return LandingLayout
    default:
      return AuthLayout
  }
})

// The skip link targets `<main id="main">`, which every layout renders except the
// auth layout (login/register/workspaces), so it is only shown elsewhere.
const showSkipLink = computed(() => route.meta.layout !== 'auth')
</script>

<template>
  <SplashScreen v-if="showSplash" />
  <template v-else>
    <!-- First focusable element on the page: moves keyboard focus straight to the
         main content landmark. Visually hidden until focused. -->
    <a v-if="showSkipLink" class="skip-link" href="#main" :aria-label="t('a11y.skip_to_content')">
      {{ t('a11y.skip_to_content') }}
    </a>
    <!-- Root-level controls for layouts that do not own their own header. -->
    <GlobalControls />
    <!-- One session-expired banner for the whole app, shown on any page. -->
    <SessionNotice />
    <!-- One inactivity warning dialog, driven by the active context's idle runtime. -->
    <IdleWarningDialog />
    <component :is="layout">
      <RouterView />
    </component>
    <!-- One confirmation dialog for every Logout button in the app. -->
    <ConfirmDialog
      :open="logoutOpen"
      :loading="loggingOut"
      :title="t('action.logout_title')"
      :message="t('action.logout_message')"
      :confirm-label="t('action.logout')"
      :cancel-label="t('action.cancel')"
      @confirm="confirmLogout"
      @cancel="cancelLogout"
      @dismiss="cancelLogout"
    />
    <!-- One workspace-switch picker for every Switch button in the app. -->
    <WorkspaceSwitchDialog :open="workspaceSwitchOpen" @close="closeWorkspaceSwitch" />
  </template>
</template>

<style scoped>
/*
 * Skip link: off-screen until it receives keyboard focus, then it slides into
 * the top-left corner above page chrome (menu, global controls). Uses an existing
 * focus ring from base.css; no transition, so there is nothing to reduce.
 */
.skip-link {
  position: fixed;
  top: var(--space-3);
  left: var(--space-3);
  z-index: var(--z-modal);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  font-size: var(--font-size-sm);
  text-decoration: none;
  transform: translateY(calc(-100% - var(--space-4)));
}

.skip-link:focus {
  transform: translateY(0);
}
</style>
