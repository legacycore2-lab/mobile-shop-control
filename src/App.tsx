// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useCallback, useRef } from 'react'
import { startRealtime, stopRealtime } from '@/lib/realtime'
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
import { LedgerPage }         from '@/pages/payments/LedgerPage'
import { PartyStatementPage } from '@/pages/payments/PartyStatementPage'
import { ImportPage }         from '@/pages/import/ImportPage'
import { ExpensesPage }       from '@/pages/expenses/ExpensesPage'
import { QuickScanModal } from '@/pages/dashboard/QuickScanModal'
import { DeviceFlashCard } from '@/components/shared/DeviceFlashCard'
import { AppErrorBoundary, PageErrorBoundary } from '@/components/shared/ErrorBoundary'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

// ── Realtime ──────────────────────────────────────────────────────────────────
function RealtimeStarter() {
  const qc = useQueryClient()
  useEffect(() => {
    startRealtime(qc)
    return () => stopRealtime()
  }, [qc])
  return null
}

// ── Global USB Scanner — يشتغل في كل الصفحات دايماً ─────────────────────────
function GlobalUsbScanner({ onScan }: { onScan: (code: string) => void }) {
  const buf   = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScan = useCallback(onScan, [onScan])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // لو الفوكس على input أو textarea — الأجهزة بتكتب فيه عادي
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Enter') {
        const code = buf.current.trim()
        // IMEI: 15 رقم — Barcode: 8+ أرقام
        if (code.length >= 8) handleScan(code)
        buf.current = ''
        if (timer.current) clearTimeout(timer.current)
        return
      }

      if (e.key.length === 1) {
        buf.current += e.key
        if (timer.current) clearTimeout(timer.current)
        // الـ USB scanner بيبعت كل الأرقام في أقل من 50ms
        timer.current = setTimeout(() => { buf.current = '' }, 150)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [handleScan])

  return null
}

// ── Guard ─────────────────────────────────────────────────────────────────────
function Guard() {
  const { session, profile, loading } = useAuth()
  const [scanModal, setScanModal] = useState(false)
  const [scanCode,  setScanCode]  = useState('')

  const handleGlobalScan = useCallback((code: string) => {
    setScanCode(code)
    setScanModal(true)
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session && !profile) return <LoginPage />

  return (
    <AppErrorBoundary>
    <>
      <RealtimeStarter />
      {/* Global USB Scanner — يقرأ في كل الصفحات */}
      {!scanModal && <GlobalUsbScanner onScan={handleGlobalScan} />}

      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"           element={<PageErrorBoundary><DashboardPage /></PageErrorBoundary>} />
          <Route path="/devices"    element={<PageErrorBoundary><DevicesPage /></PageErrorBoundary>} />
          <Route path="/pos"        element={<PageErrorBoundary><PosPage /></PageErrorBoundary>} />
          <Route path="/purchases"  element={<PageErrorBoundary><PurchasesPage /></PageErrorBoundary>} />
          <Route path="/suppliers"  element={<PageErrorBoundary><SuppliersPage /></PageErrorBoundary>} />
          <Route path="/customers"  element={<PageErrorBoundary><CustomersPage /></PageErrorBoundary>} />
          <Route path="/products"   element={<PageErrorBoundary><ProductsPage /></PageErrorBoundary>} />
          <Route path="/reports"    element={<PageErrorBoundary><ReportsPage /></PageErrorBoundary>} />
          <Route path="/audit"      element={<PageErrorBoundary><AuditLogsPage /></PageErrorBoundary>} />
          <Route path="/ledger"                    element={<PageErrorBoundary><LedgerPage /></PageErrorBoundary>} />
          <Route path="/ledger/:type/:id"          element={<PageErrorBoundary><PartyStatementPage /></PageErrorBoundary>} />
          <Route path="/expenses"   element={<PageErrorBoundary><ExpensesPage /></PageErrorBoundary>} />
          <Route path="/import"     element={<PageErrorBoundary><ImportPage /></PageErrorBoundary>} />
          <Route path="/settings"   element={<PageErrorBoundary><SettingsPage /></PageErrorBoundary>} />
          <Route path="*"           element={<PageErrorBoundary><Navigate to="/" replace /></PageErrorBoundary>} />
        </Route>
      </Routes>

      {/* Flash Card — بتظهر تلقائي لما يجي سكان */}
      {scanModal && (
        <DeviceFlashCard
          code={scanCode}
          onClose={() => { setScanModal(false); setScanCode('') }}
        />
      )}
    </>
    </AppErrorBoundary>
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
