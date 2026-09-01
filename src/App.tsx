// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DevicesPage } from '@/pages/devices/DevicesPage'
import { PosPage } from '@/pages/pos/PosPage'
import { PurchasesPage } from '@/pages/purchases/PurchasesPage'
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage'
import { CustomersPage } from '@/pages/customers/CustomersPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { AuditLogsPage } from '@/pages/audit/AuditLogsPage'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

function Guard() {
  const { session, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session && !profile) return <LoginPage />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/"           element={<DashboardPage />} />
        <Route path="/devices"    element={<DevicesPage />} />
        <Route path="/pos"        element={<PosPage />} />
        <Route path="/purchases"  element={<PurchasesPage />} />
        <Route path="/suppliers"  element={<SuppliersPage />} />
        <Route path="/customers"  element={<CustomersPage />} />
        <Route path="/products"   element={<ProductsPage />} />
        <Route path="/reports"    element={<ReportsPage />} />
        <Route path="/audit"      element={<AuditLogsPage />} />
        <Route path="/settings"   element={<SettingsPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <BrowserRouter basename="/mobile-shop-control">
            <Guard />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
