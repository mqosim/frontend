import { computed, type ComputedRef, type Ref } from 'vue'
import { useField, useSubmitCount } from 'vee-validate'

export interface FormField<TValue> {
  readonly value: Ref<TValue>
  /** Translated-ready message key, or '' while the error should stay hidden. */
  readonly error: ComputedRef<string>
  readonly blur: () => void
}

/**
 * Binds one input to a vee-validate field and hides its error until the user has
 * interacted with it (blur) or attempted a submit ("reward early, punish late").
 * This is the single place the show/hide rule lives, so every form behaves alike.
 */
export const useFormField = <TValue>(name: string): FormField<TValue> => {
  const { value, errorMessage, meta, handleBlur } = useField<TValue>(name)
  const submitCount = useSubmitCount()

  const error = computed<string>(() => {
    const show = meta.touched || submitCount.value > 0
    return show && errorMessage.value ? errorMessage.value : ''
  })

  // Validate on blur too, so an untouched empty field reports once left alone.
  const blur = (): void => handleBlur(undefined, true)

  return { value, error, blur }
}
