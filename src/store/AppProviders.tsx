import type { ReactNode } from 'react'
import { CatalogProvider } from './CatalogContext'
import { StoreProvider } from './StoreContext'
import { ToastProvider } from './ToastContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CatalogProvider>
      <StoreProvider>
        <ToastProvider>{children}</ToastProvider>
      </StoreProvider>
    </CatalogProvider>
  )
}
