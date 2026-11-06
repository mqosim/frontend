// Public surface of the org-dashboard feature. Other features and the
// composition root must import from here, never from a feature's internal layers.
export { orgRoutes } from './presentation/routes'
export { default as OrgShell } from './presentation/components/OrgShell.vue'
export { default as PersonalDashboardPage } from './presentation/components/PersonalDashboardPage.vue'
export { useModuleMenu } from './presentation/composables/useModuleMenu'
