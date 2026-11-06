<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthSessionStore, useAuthUseCases, useWorkspaceSwitch } from '@/features/auth'
import { useOrgLogout } from '@/features/org-dashboard/presentation/composables/useOrgLogout'
import { useSystemLogout } from '@/features/system-admin'
import { SystemUseCasesKey } from '@/features/system-auth'
import { useConfirmLogout } from '@/shared/presentation/composables/useConfirmLogout'

/**
 * The top-right user control of the authenticated chrome (the shared
 * organization header and the personal layout header): avatar plus the derived
 * display name, opening a small dropdown with the account's email, the
 * workspace-switch action for eligible principals and the single Logout action.
 * With the `system` prop it serves the SYSTEM (Superadmin) shell instead: the
 * profile comes from the system session, no workspace switch is offered and
 * logout goes through the system-context flow. Both flows share the same
 * confirmation dialog → use case → login-redirect shape, so there is no second
 * mechanism for either. The dropdown closes on selecting an action, on an
 * outside click and on Escape, returning focus to the trigger.
 */
const props = defineProps<{ system?: boolean }>()

const { t } = useI18n()
const session = useAuthSessionStore()
const auth = useAuthUseCases()
const systemAuth = inject(SystemUseCasesKey)
const { loggingOut: orgLoggingOut, logout: orgLogout } = useOrgLogout()
const { loggingOut: systemLoggingOut, logout: systemLogout } = useSystemLogout()
const { requestLogout } = useConfirmLogout()
const { requestWorkspaceSwitch } = useWorkspaceSwitch()

const loggingOut = computed(() => (props.system ? systemLoggingOut.value : orgLoggingOut.value))

// UserMe carries no name, so the display name and initials are derived from the
// account email (`muhammad.yusuf@x.com` → "Muhammad Yusuf" / "MY") and never
// stored anywhere.
const email = ref<string | null>(null)

onMounted(async () => {
  const profile = props.system ? await systemAuth?.getProfile() : await auth.getProfile()
  if (profile?.ok) email.value = profile.value.email
})

const localPart = computed(() => (email.value ?? '').split('@')[0] ?? '')

const nameWords = computed(() =>
  localPart.value
    .split(/[._\-+]+/)
    .filter((part) => part.length > 0 && /^[a-zA-Z0-9]+$/.test(part))
    .slice(0, 2),
)

const displayName = computed(() => {
  if (nameWords.value.length === 0) return localPart.value
  return nameWords.value
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
})

const initials = computed(() => {
  if (nameWords.value.length > 0) {
    return nameWords.value.map((word) => word.charAt(0).toUpperCase()).join('')
  }
  const letters = localPart.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2)
  return letters.length > 0 ? letters.toUpperCase() : '··'
})

const roleKey = computed(() => {
  if (props.system) return 'settings.role_system'
  switch (session.principalType) {
    case 'ORG':
      return 'settings.role_org'
    case 'SYSTEM':
      return 'settings.role_system'
    default:
      return 'settings.role_user'
  }
})

// Only a PERSON can switch workspaces; a real ORG account has just the one and
// the SYSTEM area has no workspace concept at all.
const canSwitch = computed(() => !props.system && session.principal?.type === 'PERSON')

// ── Dropdown state: disclosure pattern ──────────────────────────────────────
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

const close = (): void => {
  open.value = false
}

const onDocumentPointerDown = (event: PointerEvent): void => {
  if (
    open.value &&
    rootRef.value !== null &&
    event.target instanceof Node &&
    !rootRef.value.contains(event.target)
  ) {
    close()
  }
}

const onRootKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && open.value) {
    close()
    triggerRef.value?.focus()
  }
}

const onRootFocusout = (event: FocusEvent): void => {
  if (
    open.value &&
    rootRef.value !== null &&
    event.relatedTarget instanceof Node &&
    !rootRef.value.contains(event.relatedTarget)
  ) {
    close()
  }
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onDocumentPointerDown)
  else document.removeEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

const onSwitch = (): void => {
  // Close first: the shared workspace dialog at the app root takes over.
  close()
  requestWorkspaceSwitch()
}

const onLogout = (): void => {
  // Close first, then confirm: the shared dialog at the app root takes over.
  close()
  requestLogout(props.system ? systemLogout : orgLogout)
}
</script>

<template>
  <div ref="rootRef" class="user-menu" @keydown="onRootKeydown" @focusout="onRootFocusout">
    <button
      ref="triggerRef"
      type="button"
      class="user-menu__trigger"
      :aria-label="t('user.menu')"
      aria-haspopup="true"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="user-menu__avatar" aria-hidden="true">{{ initials }}</span>
      <span class="user-menu__who">
        <span class="user-menu__name">{{ displayName }}</span>
        <span class="user-menu__role">{{ t(roleKey) }}</span>
      </span>
      <svg class="user-menu__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div v-if="open" class="user-menu__panel">
      <div class="user-menu__identity">
        <span class="user-menu__avatar user-menu__avatar--panel" aria-hidden="true">{{
          initials
        }}</span>
        <span class="user-menu__who user-menu__who--panel">
          <span class="user-menu__name">{{ displayName }}</span>
          <span v-if="email !== null" class="user-menu__email">{{ email }}</span>
        </span>
      </div>

      <div class="user-menu__divider" aria-hidden="true"></div>

      <button v-if="canSwitch" type="button" class="user-menu__action" @click="onSwitch">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 9h12M13 6l3 3-3 3" />
          <path d="M20 15H8M11 12l-3 3 3 3" />
        </svg>
        <span>{{ t('action.switch_workspace') }}</span>
      </button>

      <button
        type="button"
        class="user-menu__action"
        :aria-busy="loggingOut"
        :disabled="loggingOut"
        @click="onLogout"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        <span>{{ t('action.logout') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

.user-menu__trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--global-controls-height);
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  font: inherit;
  color: var(--color-text);
  cursor: pointer;
}

.user-menu__trigger:hover {
  background-color: var(--color-bg);
}

.user-menu__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 13px;
  font-weight: 600;
}

.user-menu__who {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  text-align: left;
}

.user-menu__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.user-menu__role,
.user-menu__email {
  font-size: 12px;
  color: var(--color-text-muted);
}

.user-menu__email {
  overflow: hidden;
  max-width: 190px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__chevron {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.user-menu__panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: var(--z-menu);
  min-width: 272px;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.user-menu__identity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: var(--space-2);
}

.user-menu__who--panel {
  min-width: 0;
}

.user-menu__divider {
  height: 1px;
  margin: var(--space-1) 0;
  background-color: var(--color-border);
}

.user-menu__action {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 2.5rem;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  font: inherit;
  color: var(--color-text);
  /* Menu items stay on one line in every supported language; the panel grows
     instead of wrapping the label onto two lines. */
  white-space: nowrap;
  cursor: pointer;
}

.user-menu__action:hover:not(:disabled) {
  background-color: var(--color-bg);
}

.user-menu__action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.user-menu__action svg {
  width: var(--icon-size-action);
  height: var(--icon-size-action);
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* On small screens the trigger keeps only the avatar; the dropdown still
   carries the name and email. */
@media (max-width: 48rem) {
  .user-menu__who:not(.user-menu__who--panel),
  .user-menu__trigger .user-menu__chevron {
    display: none;
  }
}
</style>
