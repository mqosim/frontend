import { z } from 'zod'

/**
 * Mirrors the backend phone validator exactly: digits only, 9 or 12 digits,
 * no leading "+". (The spec's `+998…` example contradicts the real validator.)
 */
export const PHONE_PATTERN = /^([0-9]{9}|[0-9]{12})$/

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Every message is an i18n key; the view translates it. Zod's built-in English
// messages are avoided on purpose.
const issue = (message: string) => ({ code: z.ZodIssueCode.custom, message })

/**
 * Digits only, which is what the backend's phone validator accepts: drops spaces,
 * dashes, parentheses and a leading "+" ("+998 90 123-45-67" -> "998901234567").
 */
export const normalizePhone = (value: string): string => value.replace(/[^0-9]/g, '')

/** The single login identifier, mapped to the one key the API expects. */
export type LoginIdentifier = { readonly email: string } | { readonly phoneNumber: string }

/**
 * The schema below guarantees the identifier is a valid email (which always
 * contains "@") or a valid phone number, so an "@" reliably means email here.
 */
export const toLoginIdentifier = (value: string): LoginIdentifier =>
  value.includes('@') ? { email: value } : { phoneNumber: normalizePhone(value) }

/**
 * One identifier (email OR phone) plus a password, never both: an "@" makes it an
 * email, anything else is treated as a phone number.
 */
export const loginSchema = z
  .object({
    identifier: z.string().trim(),
    password: z.string(),
  })
  .superRefine((value, ctx) => {
    const { identifier } = value
    if (identifier.length === 0) {
      ctx.addIssue({ ...issue('validation.identifier_required'), path: ['identifier'] })
    } else if (identifier.includes('@')) {
      if (!EMAIL_PATTERN.test(identifier)) {
        ctx.addIssue({ ...issue('validation.email'), path: ['identifier'] })
      }
    } else if (!PHONE_PATTERN.test(normalizePhone(identifier))) {
      ctx.addIssue({ ...issue('validation.phone'), path: ['identifier'] })
    }
    if (value.password.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['password'] })
    }
  })

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    email: z.string().trim(),
    phone: z.string().trim(),
    password: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.email.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['email'] })
    } else if (!EMAIL_PATTERN.test(value.email)) {
      ctx.addIssue({ ...issue('validation.email'), path: ['email'] })
    }
    if (value.phone.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['phone'] })
    } else if (!PHONE_PATTERN.test(value.phone)) {
      ctx.addIssue({ ...issue('validation.phone'), path: ['phone'] })
    }
    // The backend requires 8..72 characters.
    if (value.password.length < 8 || value.password.length > 72) {
      ctx.addIssue({ ...issue('validation.password_length'), path: ['password'] })
    }
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
