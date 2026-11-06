// Public surface of the auth feature. Other features and the composition root
// must import from here, never from a feature's internal layers.
export { authRoutes } from './presentation/routes'
export { AuthUseCasesKey } from './presentation/di'
export { useAuthUseCases } from './presentation/composables/useAuthUseCases'
export { useWorkspaceLabel } from './presentation/composables/useWorkspaceLabel'
export { useWorkspaceSwitch } from './presentation/composables/useWorkspaceSwitch'
export { loadAccountWorkspaces } from './presentation/stores/accountWorkspaces'
export { useAuthSessionStore } from './presentation/stores/sessionStore'
export type { AuthStatus } from './presentation/stores/sessionStore'
export { default as WorkspaceSwitchDialog } from './presentation/components/WorkspaceSwitchDialog.vue'
export type { AuthUseCases } from './application/useCases'
export type {
  AuthOutcome,
  EimzoKey,
  WorkspaceChoice,
  WorkspaceList,
  WorkspaceOption,
  WorkspaceState,
} from './domain/entities'
