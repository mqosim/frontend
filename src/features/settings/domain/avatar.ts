import type { Result } from '@/shared/domain'

/** Avatar images accepted by the frontend picker. */
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Maximum avatar upload size accepted by the frontend: 5 MiB. */
export const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024

export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number]

/** A custom avatar currently associated with the authenticated account. */
export interface ProfileAvatar {
  readonly url: string
  readonly fileName: string
  readonly mimeType: AvatarMimeType
  readonly size: number
}

/** Stable error codes returned by an avatar adapter. */
export type AvatarServiceErrorCode =
  | 'unsupported_type'
  | 'file_too_large'
  | 'invalid_image'
  | 'load_failed'
  | 'save_failed'
  | 'remove_failed'

export interface AvatarServiceError {
  readonly code: AvatarServiceErrorCode
}

export type AvatarServiceResult<T> = Result<T, AvatarServiceError>

/**
 * UI-independent avatar operations. A future HTTP adapter can implement this
 * contract without exposing endpoint, multipart, or response details to the UI.
 */
export interface AvatarService {
  getAvatar(): Promise<AvatarServiceResult<ProfileAvatar | null>>
  updateAvatar(file: File): Promise<AvatarServiceResult<ProfileAvatar>>
  removeAvatar(): Promise<AvatarServiceResult<void>>
  /** Releases adapter-owned resources when the authenticated session ends. */
  dispose(): void
}
