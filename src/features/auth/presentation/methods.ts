/** One selectable method tab: a stable `id` and the (globally unique) label key. */
export interface MethodOption<T extends string> {
  readonly id: T
  /** The (globally unique) phrase key for the visible label. */
  readonly labelKey: string
}

/** The three sign-in methods, in the order they are shown. */
export type LoginMethod = 'eimzo' | 'password' | 'usb'

export const LOGIN_METHODS: readonly MethodOption<LoginMethod>[] = [
  { id: 'eimzo', labelKey: 'auth.method_eimzo' },
  { id: 'password', labelKey: 'auth.method_password' },
  { id: 'usb', labelKey: 'auth.method_usb' },
]
