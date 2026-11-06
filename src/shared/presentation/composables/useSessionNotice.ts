import { ref } from 'vue'

/**
 * A single app-wide, non-blocking notice shown after a session ends unexpectedly
 * (an expired token whose refresh failed, or an idle timeout). State lives at
 * module scope, mirroring `useConfirmLogout`/`useTheme`, so the one banner
 * rendered at the app root is the only instance. It is set from the session and
 * idle runtimes (plain infrastructure) and read by the root `SessionNotice`
 * component.
 */
const messageKey = ref<string | null>(null)

/** Shows the notice with the given globally-unique i18n key. */
export const showSessionNotice = (key: string): void => {
  messageKey.value = key
}

/** The session could not be renewed and the user must sign in again. */
export const showSessionExpired = (): void => {
  showSessionNotice('session.expired')
}

/** The session was ended by the inactivity timeout. */
export const showIdleLogout = (): void => {
  showSessionNotice('session.idle_logged_out')
}

export const useSessionNotice = () => {
  const dismiss = (): void => {
    messageKey.value = null
  }

  return { messageKey, dismiss }
}
