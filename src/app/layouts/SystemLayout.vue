<script setup lang="ts">
import { SystemShell } from '@/features/system-admin'
import UserMenu from '@/app/components/UserMenu.vue'

/**
 * The SYSTEM (Superadmin) application shell: the shared admin sidebar and a
 * header whose only action is the top-right `UserMenu` (account info and
 * Logout — logout never renders as a separate header button). The badge and
 * the account type live in the sidebar's footer, following the org menu's
 * convention, so this layout is only composition.
 */
</script>

<template>
  <SystemShell>
    <template #header>
      <UserMenu system />
    </template>
    <slot />
  </SystemShell>
</template>
