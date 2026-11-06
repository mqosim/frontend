<script setup lang="ts">
import { onBeforeUnmount, provide } from 'vue'

import { AvatarServiceKey, createLocalAvatarService } from '@/features/settings'

import AuthenticatedHeader from '../components/AuthenticatedHeader.vue'
import OrgLayout from './OrgLayout.vue'

// The local avatar adapter is scoped to this authenticated layout instance. It
// survives route changes within the session, but is discarded on logout so a
// later login in the same tab can never inherit the previous user's photo.
const avatarService = createLocalAvatarService()
provide(AvatarServiceKey, avatarService)
onBeforeUnmount(() => avatarService.dispose())

/**
 * One shared shell for every authenticated destination, in both workspaces: the
 * org module menu, the shared header, the sub-panel and the content column. The
 * shell's workspace-aware menu gives a personal session its own compact
 * navigation (Dashboard, Settings) with the identical chrome, so navigation
 * between a module, the personal Dashboard and Settings only replaces the
 * content below the header.
 */
</script>

<template>
  <div class="authenticated-layout">
    <OrgLayout class="authenticated-layout__content">
      <template #header>
        <AuthenticatedHeader />
      </template>
      <slot />
    </OrgLayout>
  </div>
</template>

<style scoped>
.authenticated-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.authenticated-layout__content {
  flex: 1 1 auto;
  min-height: 0;
}

/*
 * The shared header occupies the shell's first row. Content begins directly
 * beneath it and keeps the reference page's compact top inset.
 */
.authenticated-layout__content :deep(.org-shell__panel),
.authenticated-layout__content :deep(.org-shell__content) {
  padding-top: var(--space-5);
}
</style>
