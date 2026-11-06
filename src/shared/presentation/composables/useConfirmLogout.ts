import { ref } from 'vue'

type LogoutAction = () => Promise<void>

/**
 * One shared logout-confirmation flow for the whole app. Any Logout button calls
 * `requestLogout(fn)` with its own (unchanged) logout function; the single
 * `ConfirmDialog` rendered at the app root then asks for confirmation and only
 * runs `fn` if the user confirms. Keeping the state at module scope mirrors
 * `useTheme` and guarantees a single dialog instance (no per-layout copies).
 */
const open = ref(false)
const loggingOut = ref(false)
let action: LogoutAction | null = null

const confirm = async (): Promise<void> => {
  if (loggingOut.value || action === null) return
  const run = action
  loggingOut.value = true
  try {
    await run()
  } finally {
    loggingOut.value = false
    open.value = false
    action = null
  }
}

const cancel = (): void => {
  // Closing is ignored while the logout request is in flight.
  if (loggingOut.value) return
  open.value = false
  action = null
}

export const useConfirmLogout = () => {
  const requestLogout = (logout: LogoutAction): void => {
    if (loggingOut.value) return
    action = logout
    open.value = true
  }

  return { open, loggingOut, requestLogout, confirm, cancel }
}
