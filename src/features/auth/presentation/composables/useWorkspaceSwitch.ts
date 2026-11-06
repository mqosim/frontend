import { ref } from 'vue'

/**
 * One shared "switch workspace" picker for the whole app. Any Switch button calls
 * `requestWorkspaceSwitch()`; the single dialog rendered at the app root reads
 * `open` and owns the data logic. Module-scope state mirrors `useConfirmLogout`
 * and `useTheme`, so there is exactly one dialog instance.
 */
const open = ref(false)

export const useWorkspaceSwitch = () => {
  const requestWorkspaceSwitch = (): void => {
    open.value = true
  }

  const close = (): void => {
    open.value = false
  }

  return { open, requestWorkspaceSwitch, close }
}
