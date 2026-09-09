// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { startRealtime, stopRealtime } from '@/lib/realtime'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { AppShell } from '@/components/layout/AppShell'
import { usePermissions } from '@/hooks/usePermissions'
import type { Resource } from '@/lib/permissions'
import { ShieldOff } from 'lucide-react'
// ── Lazy-loaded pages — each page gets its own chunk ─────────────────────────
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage      = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const QuickScanModal     = lazy(() => import('@/pages/dashboard/QuickScanModal').then(m => ({ default: m.QuickScanModal })))
const DevicesPage        = lazy(() => import('@/pages/devices/DevicesPage').then(m => ({ default: m.DevicesPage })))
const PosPage            = lazy(() => import('@/pages/pos/PosPage').then(m => ({ default: m.PosPage })))
const PurchasesPage      = lazy(() => import('@/pages/purchases/PurchasesPage').then(m => ({ default: m.PurchasesPage })))
const SuppliersPage      = lazy(() => import('@/pages/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const CustomersPage      = lazy(() => import('@/pages/customers/CustomersPage').then(m => ({ default: m.CustomersPage })))
const ProductsPage       = lazy(() => import('@/pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })))
const ReportsPage        = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage       = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AuditLogsPage      = lazy(() => import('@/pages/audit/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })))
const LedgerPage         = lazy(() => import('@/pages/payments/LedgerPage').then(m => ({ default: m.LedgerPage })))
const PartyStatementPage = lazy(() => import('@/pages/payments/PartyStatementPage').then(m => ({ default: m.PartyStatementPage })))
const ImportPage         = lazy(() => import('@/pages/import/ImportPage').then(m => ({ default: m.ImportPage })))
const ExpensesPage       = lazy(() => import('@/pages/expenses/ExpensesPage').then(m => ({ default: m.ExpensesPage })))
const AttendancePage     = lazy(() => import('@/pages/attendance/AttendancePage').then(m => ({ default: m.AttendancePage })))
const PermissionsPage    = lazy(() => import('@/pages/permissions/PermissionsPage').then(m => ({ default: m.PermissionsPage })))
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


// ── Permission-aware Route Guard ──────────────────────────────────────────────
// Renders 403 if user lacks 'view' permission for the resource
function ProtectedRoute({
  resource,
  children,
}: {
  resource: Resource
  children: React.ReactNode
}) {
  const perm = usePermissions()

  // While permissions are loading (isReady=false), show spinner
  if (!perm.isReady) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!perm.canView(resource)) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-gray-600">
      <ShieldOff size={40} className="opacity-40" />
      <p className="text-sm font-semibold">ليس لديك صلاحية الوصول لهذه الصفحة</p>
    </div>
  )

  return <>{children}</>
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

  if (!session && !profile) return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}><LoginPage /></Suspense>

  return (
    <AppErrorBoundary>
    <>
      <RealtimeStarter />
      {/* Global USB Scanner — يقرأ في كل الصفحات */}
      {!scanModal && <GlobalUsbScanner onScan={handleGlobalScan} />}

      <Routes>
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
        <Route element={<AppShell />}>
          <Route path="/"           element={<PageErrorBoundary><ProtectedRoute resource="dashboard"><DashboardPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/devices"    element={<PageErrorBoundary><ProtectedRoute resource="devices"><DevicesPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/pos"        element={<PageErrorBoundary><ProtectedRoute resource="pos"><PosPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/purchases"  element={<PageErrorBoundary><ProtectedRoute resource="purchases"><PurchasesPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/suppliers"  element={<PageErrorBoundary><ProtectedRoute resource="suppliers"><SuppliersPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/customers"  element={<PageErrorBoundary><ProtectedRoute resource="customers"><CustomersPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/products"   element={<PageErrorBoundary><ProtectedRoute resource="products"><ProductsPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/reports"    element={<PageErrorBoundary><ProtectedRoute resource="reports"><ReportsPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/audit"      element={<PageErrorBoundary><ProtectedRoute resource="audit"><AuditLogsPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/ledger"                    element={<PageErrorBoundary><ProtectedRoute resource="ledger"><LedgerPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/ledger/:type/:id"          element={<PageErrorBoundary><ProtectedRoute resource="ledger"><PartyStatementPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/expenses"   element={<PageErrorBoundary><ProtectedRoute resource="expenses"><ExpensesPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/attendance"  element={<PageErrorBoundary><ProtectedRoute resource="attendance"><AttendancePage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/permissions" element={<PageErrorBoundary><ProtectedRoute resource="permissions"><PermissionsPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/import"     element={<PageErrorBoundary><ProtectedRoute resource="import"><ImportPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="/settings"   element={<PageErrorBoundary><ProtectedRoute resource="settings"><SettingsPage /></ProtectedRoute></PageErrorBoundary>} />
          <Route path="*"           element={<PageErrorBoundary><Navigate to="/" replace /></PageErrorBoundary>} />
        </Route>
        </Suspense>
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
