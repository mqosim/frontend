import { nextTick } from 'vue'

/**
 * Moves focus to the first control the form marked invalid. Call it after a
 * failed submit so keyboard users land on the first error.
 */
export const useFocusFirstError = () => {
  const focusFirstError = async (): Promise<void> => {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }
  return { focusFirstError }
}
