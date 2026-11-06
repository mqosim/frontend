<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'

const { t } = useI18n()
</script>

<template>
  <!--
    USB token sign-in is not implemented by the backend yet
    (`POST /api/v1/auth/login_with_usb` returns 501), so this panel makes no
    request and lists nothing to avoid a fake UI. It is isolated here so it can
    be enabled once the backend and a token-listing mechanism exist.
  -->
  <section class="usb-panel">
    <h2 class="usb-panel__title">{{ t('auth.usb_title') }}</h2>
    <AppAlert variant="info">{{ t('auth.usb_text') }}</AppAlert>
  </section>
</template>

<style scoped>
.usb-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.usb-panel__title {
  font-size: var(--font-size-md);
}
</style>
