// Public surface of the notifications feature. Other features and the
// composition root must import from here, never from a feature's internal layers.
export { NotificationsUseCasesKey } from './presentation/di'
export { useNotificationsUseCases } from './presentation/composables/useNotificationsUseCases'
export type { NotificationsUseCases } from './application/useCases'
export type { DocumentEventsPreference, NotificationPreferences } from './domain/entities'
