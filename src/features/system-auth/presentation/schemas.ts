import { z } from 'zod'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Messages are i18n keys; the view translates them. */
export const systemLoginSchema = z.object({
  email: z.string().trim().min(1, 'validation.required').regex(EMAIL_PATTERN, 'validation.email'),
  password: z.string().min(1, 'validation.required'),
})

/**
 * The second factor: the contract takes one `code` field and decides from its
 * shape whether it is a 6-digit TOTP or a recovery code, so the same field and
 * the same limits (`SystemTotpRequest.code`, 1..32) serve both the TOTP step and
 * the enrollment confirmation.
 */
export const systemSecondFactorSchema = z.object({
  code: z.string().trim().min(1, 'validation.required').max(32, 'validation.max_chars'),
})

export type SystemLoginFormValues = z.infer<typeof systemLoginSchema>
