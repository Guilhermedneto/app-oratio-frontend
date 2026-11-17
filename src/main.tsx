import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from '@/app/App'
import { AuthProvider } from '@/features/conta/auth'
import { startOnlineSync } from '@/offline/sync'
import '@/styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: 14 * 86_400_000, refetchOnWindowFocus: false, retry: 1 } },
})

const persister = {
  persistClient: (c: unknown) => set('react-query', c).catch(() => undefined),
  restoreClient: () => get('react-query').catch(() => undefined),
  removeClient: () => del('react-query').catch(() => undefined),
}

registerSW({ immediate: true })
startOnlineSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: persister as never, maxAge: 14 * 86_400_000, buster: 'v2' }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
