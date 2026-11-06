import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { AuthUseCasesKey } from '@/features/auth'
import { AdminUseCasesKey, AuditLogRepositoryKey } from '@/features/system-admin'
import { SystemUseCasesKey } from '@/features/system-auth'
import { WalletServiceKey } from '@/features/wallet'
import '@/shared/presentation/styles/tokens.css'
import '@/shared/presentation/styles/base.css'

import App from './App.vue'
import { createContainer } from './di/container'

const app = createApp(App)

// Pinia first: stores are read by the router guard during the initial navigation.
app.use(createPinia())

const container = createContainer()
app.use(container.i18n)
app.use(container.router)

// Ports reach presentation through provide/inject — never a module import.
app.provide(AuthUseCasesKey, container.authUseCases)
app.provide(SystemUseCasesKey, container.systemAuthUseCases)
app.provide(WalletServiceKey, container.walletService)
app.provide(AuditLogRepositoryKey, container.auditLogRepository)
app.provide(AdminUseCasesKey, container.adminUseCases)

app.mount('#app')
