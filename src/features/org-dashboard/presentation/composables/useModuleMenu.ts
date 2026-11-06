import { ref } from 'vue'

const STORAGE_KEY = 'org.menu.collapsed'

const readStored = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// UI-only singleton, mirroring the theme's persistence pattern: the choice is
// remembered across reloads, and storage being unavailable just falls back to
// the in-memory value.
const collapsed = ref(readStored())

const clearStored = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode / storage disabled: only the in-memory value resets.
  }
}

export const useModuleMenu = () => {
  const toggle = (): void => {
    collapsed.value = !collapsed.value
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed.value))
    } catch {
      // Private mode / storage disabled: keep the in-memory value.
    }
  }

  /** Back to the expanded default with no saved preference (fresh sign-in). */
  const resetToExpanded = (): void => {
    collapsed.value = false
    clearStored()
  }

  return { collapsed, toggle, resetToExpanded }
}
