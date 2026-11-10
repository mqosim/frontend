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

/**
 * The single login identifier, mapped to the one field the API expects
 * (`LoginRequest.identifier` accepts either an email or a phone number).
 */
export type LoginIdentifier = { readonly identifier: string }

/**
 * The schema below guarantees the identifier is a valid email (which always
 * contains "@") or a valid phone number, so an "@" reliably means email here.
 * A phone number is normalised to the digits-only form the backend validator
 * accepts; an email is passed through unchanged.
 */
export const toLoginIdentifier = (value: string): LoginIdentifier =>
  value.includes('@') ? { identifier: value } : { identifier: normalizePhone(value) }

/**
 * One identifier (email OR phone), never both: an "@" makes it an email,
 * anything else is treated as a phone number. Used by login.
 */
const identifierIssue = (identifier: string, ctx: z.RefinementCtx): void => {
  if (identifier.length === 0) {
    ctx.addIssue({ ...issue('validation.identifier_required'), path: ['identifier'] })
  } else if (identifier.includes('@')) {
    if (!EMAIL_PATTERN.test(identifier)) {
      ctx.addIssue({ ...issue('validation.email'), path: ['identifier'] })
    }
  } else if (!PHONE_PATTERN.test(normalizePhone(identifier))) {
    ctx.addIssue({ ...issue('validation.phone'), path: ['identifier'] })
  }
}

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
    identifierIssue(value.identifier, ctx)
    if (value.password.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['password'] })
    }
  })

export type LoginFormValues = z.infer<typeof loginSchema>

/**
 * Step 1 of password+OTP registration: both the email that receives the OTP and
 * the phone number stored with the account. The backend validates the phone in
 * its digits-only form, so the value is normalised before the pattern check.
 */
export const registerStartSchema = z
  .object({
    email: z.string().trim(),
    phone: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.email.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['email'] })
    } else if (!EMAIL_PATTERN.test(value.email)) {
      ctx.addIssue({ ...issue('validation.email'), path: ['email'] })
    }
    const phone = normalizePhone(value.phone)
    if (phone.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['phone'] })
    } else if (!PHONE_PATTERN.test(phone)) {
      ctx.addIssue({ ...issue('validation.phone'), path: ['phone'] })
    }
  })

export type RegisterStartFormValues = z.infer<typeof registerStartSchema>

/**
 * Collapses runs of whitespace and trims. The backend's `full_name` rule is
 * "2..200 characters, no control characters"; the UI normalises before sending.
 */
export const normalizeFullName = (value: string): string => value.replace(/\s+/g, ' ').trim()

/** True when the value contains a C0 control character or DEL. */
const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint <= 0x1f || codePoint === 0x7f) return true
  }
  return false
}

/** Step 2 of password+OTP registration: code, password and full name. */
export const registerCompleteSchema = z
  .object({
    code: z.string().trim(),
    password: z.string(),
    fullName: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.code.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['code'] })
    }
    // The contract exposes only `weak_password`; the client does not invent a
    // policy, so the only local rule is "not empty".
    if (value.password.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['password'] })
    }
    const fullName = normalizeFullName(value.fullName)
    if (fullName.length < 2 || fullName.length > 200) {
      ctx.addIssue({ ...issue('validation.full_name'), path: ['fullName'] })
    } else if (hasControlCharacter(fullName)) {
      ctx.addIssue({ ...issue('validation.full_name_chars'), path: ['fullName'] })
    }
  })

export type RegisterCompleteFormValues = z.infer<typeof registerCompleteSchema>
