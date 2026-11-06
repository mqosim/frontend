import { z } from 'zod'

/**
 * Schemas for the Settings account-security forms. Every message is an i18n
 * key; the view translates it. Zod's built-in English messages are avoided on
 * purpose, exactly like the auth feature's schemas.
 *
 * The backend enforces the same rules (8–72 byte password, email format,
 * trimmed before validation) — these client schemas exist so the user gets
 * field-level feedback before a request is spent.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const issue = (message: string) => ({ code: z.ZodIssueCode.custom, message })

/** Step 1 of the email change: current password plus the new address. */
export const changeEmailSchema = (currentEmail: string | null) =>
  z
    .object({
      newEmail: z.string().trim(),
      currentPassword: z.string(),
    })
    .superRefine((value, ctx) => {
      if (value.newEmail.length === 0) {
        ctx.addIssue({ ...issue('validation.required'), path: ['newEmail'] })
      } else if (!EMAIL_PATTERN.test(value.newEmail)) {
        ctx.addIssue({ ...issue('validation.email'), path: ['newEmail'] })
      } else if (currentEmail !== null && value.newEmail === currentEmail) {
        ctx.addIssue({ ...issue('settings.email_same'), path: ['newEmail'] })
      }
      if (value.currentPassword.length === 0) {
        ctx.addIssue({ ...issue('validation.required'), path: ['currentPassword'] })
      }
    })

export type ChangeEmailFormValues = z.infer<ReturnType<typeof changeEmailSchema>>

/** The confirmation code shape the API contract fixes: exactly 6 digits. */
export const EMAIL_CODE_PATTERN = /^[0-9]{6}$/

/** Step 2 of the email change: the 6-digit code from the new inbox. */
export const emailCodeSchema = z.object({
  code: z.string().trim().regex(EMAIL_CODE_PATTERN, 'settings.code_invalid'),
})

export type EmailCodeFormValues = z.infer<typeof emailCodeSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.currentPassword.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['currentPassword'] })
    }
    // The backend requires 8..72 characters and a password that differs.
    if (value.newPassword.length < 8 || value.newPassword.length > 72) {
      ctx.addIssue({ ...issue('validation.password_length'), path: ['newPassword'] })
    } else if (value.newPassword === value.currentPassword) {
      ctx.addIssue({ ...issue('settings.password_same'), path: ['newPassword'] })
    }
    if (value.confirmPassword.length === 0) {
      ctx.addIssue({ ...issue('validation.required'), path: ['confirmPassword'] })
    } else if (value.confirmPassword !== value.newPassword) {
      ctx.addIssue({ ...issue('settings.password_mismatch'), path: ['confirmPassword'] })
    }
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
