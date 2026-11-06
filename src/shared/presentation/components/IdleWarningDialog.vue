<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmDialog from './ConfirmDialog.vue'
import { useIdleTimeout } from '../composables/useIdleTimeout'

const { t } = useI18n()
const { visible, secondsLeft, busy, stayAlive, logoutNow } = useIdleTimeout()

const message = computed(() => t('session.idle_message', { seconds: secondsLeft.value }))

// Announce only at a few points, so a screen reader is not flooded every second.
const announcement = computed(() => {
  const seconds = secondsLeft.value
  if (seconds === 60 || seconds === 30 || seconds === 10) {
    return t('session.idle_message', { seconds })
  }
  return ''
})
</script>

<!--
  The inactivity warning. It reuses `ConfirmDialog` for the native-modal focus
  trap, top-layer stacking (above the drawer and global controls) and tokens.
  Escape and backdrop behave like "Stay signed in": dismissing a security prompt
  should never be the action that logs the user out.
-->
<template>
  <ConfirmDialog
    :open="visible"
    :title="t('session.idle_title')"
    :message="message"
    :announcement="announcement"
    :confirm-label="t('session.idle_stay')"
    :cancel-label="t('session.idle_logout')"
    :loading="busy"
    initial-focus="confirm"
    @confirm="stayAlive"
    @dismiss="stayAlive"
    @cancel="logoutNow"
  />
</template>
