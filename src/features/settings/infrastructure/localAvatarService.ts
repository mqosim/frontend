import { err, ok } from '@/shared/domain'

import { AVATAR_MAX_FILE_SIZE, AVATAR_MIME_TYPES } from '../domain/avatar'
import type { AvatarService, AvatarServiceResult, ProfileAvatar } from '../domain/avatar'

/**
 * Local-only development adapter. It intentionally makes no network requests:
 * the selected image lives in memory for the current application session and is
 * lost on reload. Object URLs are owned by this adapter so replacing or removing
 * the current avatar always releases the previous one.
 */
export const createLocalAvatarService = (): AvatarService => {
  let currentAvatar: ProfileAvatar | null = null
  let currentObjectUrl: string | null = null

  const releaseCurrentUrl = (): void => {
    if (currentObjectUrl === null) return
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }

  return {
    getAvatar: async (): Promise<AvatarServiceResult<ProfileAvatar | null>> => ok(currentAvatar),

    updateAvatar: async (file: File): Promise<AvatarServiceResult<ProfileAvatar>> => {
      if (!AVATAR_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
        return err({ code: 'unsupported_type' })
      }
      if (file.size > AVATAR_MAX_FILE_SIZE) {
        return err({ code: 'file_too_large' })
      }

      let url: string
      try {
        url = URL.createObjectURL(file)
      } catch {
        return err({ code: 'save_failed' })
      }
      releaseCurrentUrl()

      currentObjectUrl = url
      currentAvatar = {
        url,
        fileName: file.name,
        mimeType: file.type as ProfileAvatar['mimeType'],
        size: file.size,
      }
      return ok(currentAvatar)
    },

    removeAvatar: async (): Promise<AvatarServiceResult<void>> => {
      releaseCurrentUrl()
      currentAvatar = null
      return ok(undefined)
    },

    dispose: (): void => {
      releaseCurrentUrl()
      currentAvatar = null
    },
  }
}
