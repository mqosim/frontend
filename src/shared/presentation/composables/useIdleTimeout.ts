import { ref } from 'vue'

/** The two actions the idle warning dialog offers, wired by the composition root. */
export interface IdleDialogApi {
  /** Verifies the session and resets the idle clock. */
  stayAlive(): void
  /** Ends the session immediately. */
  logoutNow(): void
}

const visible = ref(false)
const secondsLeft = ref(0)
const busy = ref(false)
let api: IdleDialogApi | null = null

/**
 * Binds the currently active context's idle actions. State lives at module scope,
 * mirroring `useConfirmLogout`, so the one dialog rendered at the app root is the
 * only instance. Passing `null` (context became anonymous) closes the dialog.
 */
export const registerIdleDialog = (next: IdleDialogApi | null): void => {
  api = next
  if (next === null) {
    visible.value = false
    busy.value = false
    secondsLeft.value = 0
  }
}

/** Called by the idle runtime: a positive number shows/updates the dialog, `null` hides it. */
export const setIdleWarning = (seconds: number | null): void => {
  if (seconds === null) {
    visible.value = false
    return
  }
  secondsLeft.value = seconds
  visible.value = true
}

/** Reflects an in-flight "stay signed in" (refresh) so the dialog can show busy state. */
export const setIdleBusy = (value: boolean): void => {
  busy.value = value
}

export const useIdleTimeout = () => ({
  visible,
  secondsLeft,
  busy,
  stayAlive: (): void => api?.stayAlive(),
  logoutNow: (): void => api?.logoutNow(),
})
