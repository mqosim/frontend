import { z } from 'zod'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Messages are i18n keys; the view translates them. */
export const systemLoginSchema = z.object({
  email: z.string().trim().min(1, 'validation.required').regex(EMAIL_PATTERN, 'validation.email'),
  password: z.string().min(1, 'validation.required'),
})

export type SystemLoginFormValues = z.infer<typeof systemLoginSchema>
