// Public surface of the settings feature. Other features and the composition
// root must import from here, never from a feature's internal layers.
export { settingsRoutes } from './presentation/routes'
export { AvatarServiceKey } from './presentation/di'
export { default as AppearanceSettingsSection } from './presentation/views/AppearanceSettingsSection.vue'
export { default as LanguageSettingsSection } from './presentation/views/LanguageSettingsSection.vue'
export { useAvatarService } from './presentation/composables/useAvatarService'
export { createLocalAvatarService } from './infrastructure/localAvatarService'
export type {
  AvatarMimeType,
  AvatarService,
  AvatarServiceError,
  AvatarServiceErrorCode,
  AvatarServiceResult,
  ProfileAvatar,
} from './domain/avatar'
