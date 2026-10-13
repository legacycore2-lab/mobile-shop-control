// src/pages/reports/ReportsPage.tsx
// ── Lean shell — state, hooks, routing only ───────────────────────────────────
import { Suspense, useState, lazy } from 'react'
import { Download, Printer } from 'lucide-react'
import {
  useReportSummary, useDeviceSalesReport, useStockValueReport,
  useSupplierPurchasesReport, useDailyActivityReport, useLowStockReport,
  useTopCustomersReport, useProductMovementReport, useDeviceMovementReport,
  useCashierPerformance,
} from '@/hooks/useReports'
import { useSupplierLedger } from '@/hooks/usePayments'
import { useExpenses } from '@/hooks/useExpenses'
import { useProfitability } from '@/hooks/useProfitability'
import { reportAggregates } from '@/services/reports.service'
import { profitabilityService, type ProfitKind } from '@/services/profitability.service'
import { fmt } from '@/lib/fmt'
import { exportToExcel, SOH_PRODUCT_HEADERS, SOH_DEVICE_HEADERS } from '@/lib/exportUtils'
import {
  exportOverviewPdf, exportSalesPdf, exportStockPdf,
  exportSuppliersPdf, exportCustomersPdf, exportAlertsPdf, exportTopProfitPdf,
  exportProfitPdf, exportProductSalesPdf, exportBrandsPdf, exportExpensesPdf, exportCashierPdf,
  type PdfOutput,
} from '@/lib/pdfExport'
import {
  printOverview, printSales, printStock,
  printSuppliers, printCustomers, printAlerts, printMovement,
} from './print/printEngine'
import { ReportNav } from './components/ReportNav'
import { DateRangeBar } from './components/DateRangeBar'
// ── Lazy-loaded report tabs ───────────────────────────────────────────────────
const OverviewTabContent      = lazy(() => import('./tabs/OverviewTab').then(m      => ({ default: m.OverviewTabContent })))
const SalesTabContent         = lazy(() => import('./tabs/SalesTab').then(m         => ({ default: m.SalesTabContent })))
const StockTabContent         = lazy(() => import('./tabs/StockTab').then(m         => ({ default: m.StockTabContent })))
const SuppliersTabContent     = lazy(() => import('./tabs/SuppliersTab').then(m     => ({ default: m.SuppliersTabContent })))
const CustomersTabContent     = lazy(() => import('./tabs/CustomersTab').then(m     => ({ default: m.CustomersTabContent })))
const AlertsTabContent        = lazy(() => import('./tabs/AlertsTab').then(m        => ({ default: m.AlertsTabContent })))
const MovementTabContent      = lazy(() => import('./tabs/MovementTab').then(m      => ({ default: m.MovementTabContent })))
const ProfitTabContent        = lazy(() => import('./tabs/ProfitTab').then(m        => ({ default: m.ProfitTabContent })))
const BrandsTabContent        = lazy(() => import('./tabs/BrandsTab').then(m        => ({ default: m.BrandsTabContent })))
const ExpensesReportTabContent = lazy(() => import('./tabs/ExpensesReportTab').then(m => ({ default: m.ExpensesReportTabContent })))
const CashierTabContent       = lazy(() => import('./tabs/CashierTab').then(m       => ({ default: m.CashierTabContent })))
const PriceListTabContent     = lazy(() => import('./tabs/PriceListTab').then(m     => ({ default: m.PriceListTabContent })))
const ProductSalesTabContent  = lazy(() => import('./tabs/ProductSalesTab').then(m => ({ default: m.ProductSalesTabContent })))
const TopProfitTabContent     = lazy(() => import('./tabs/TopProfitTab').then(m     => ({ default: m.TopProfitTabContent })))
import type { Tab } from './types'

const PROFIT_KIND_LABELS: Record<ProfitKind, string> = { all: 'الأجهزة والمنتجات', device: 'الأجهزة', product: 'المنتجات' }
const PDF_TABS: readonly Tab[] = ['overview', 'sales', 'stock', 'suppliers', 'customers', 'alerts', 'movement', 'topprofit', 'productsales', 'profit', 'brands', 'expenses', 'cashier']

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [tab,    setTab]    = useState<Tab>('overview')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all')
  const [filterFrom, setFilterFrom] = useState<string>('')
  const [filterTo,   setFilterTo]   = useState<string>('')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfLoading,   setPdfLoading]   = useState(false)
  const [profitKind,   setProfitKind]   = useState<ProfitKind>('all')

  const dateRange = filterFrom && filterTo
    ? `من ${filterFrom} إلى ${filterTo}`
    : filterFrom ? `من ${filterFrom}` : filterTo ? `إلى ${filterTo}` : 'كل البيانات'

  // ── Data hooks ────────────────────────────────────────────────────────────
  const { data: summary,      isLoading: sumLoad  } = useReportSummary(filterFrom || undefined, filterTo || undefined)
  const { data: sales = [],   isLoading: saleLoad } = useDeviceSalesReport(filterFrom || undefined, filterTo || undefined)
  const { data: stock = [],   isLoading: stckLoad } = useStockValueReport()
  const { data: suppliers = [], isLoading: supLoad } = useSupplierPurchasesReport(filterFrom || undefined, filterTo || undefined)
  const { data: activity = [], isLoading: actLoad } = useDailyActivityReport()
  const { data: lowStock = [], isLoading: lowLoad } = useLowStockReport()
  const { data: customers = [], isLoading: custLoad } = useTopCustomersReport(filterFrom || undefined, filterTo || undefined)
  const { data: supplierLedger = [] } = useSupplierLedger()
  const { data: expenses = [],     isLoading: expLoad     } = useExpenses()
  const { data: cashierData = [],  isLoading: cashierLoad } = useCashierPerformance(
    filterFrom || undefined, filterTo || undefined
  )

  const { data: profitRows = [] } = useProfitability(filterFrom || undefined, filterTo || undefined)

  const today        = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const [movFrom, setMovFrom] = useState(firstOfMonth)
  const [movTo,   setMovTo]   = useState(today)
  const [movType, setMovType] = useState<'products' | 'devices'>('products')
  const { data: prodMovement = [], isLoading: prodMovLoad, refetch: refetchProd } = useProductMovementReport(movFrom, movTo)
  const { data: devMovement  = [], isLoading: devMovLoad,  refetch: refetchDev  } = useDeviceMovementReport(movFrom, movTo)

  // ── Shared tab props ──────────────────────────────────────────────────────
  const tabProps = {
    summary: summary as Record<string,number>|undefined,
    sales, stock, suppliers, activity, lowStock, customers,
    supplierLedger, prodMovement, devMovement,
    sumLoad, saleLoad, stckLoad, supLoad, actLoad, lowLoad, custLoad, prodMovLoad, devMovLoad,
    movFrom, movTo, movType, setMovFrom, setMovTo, setMovType,
    selectedSupplierId, setSelectedSupplierId,
    refetchProd, refetchDev,
    filterFrom, filterTo,
    expenses, expLoad,
    cashierData, cashierLoad,
    exportMovementCsv: () => {
      if (movType === 'products') exportToExcel(`تقرير-حركة-المنتجات-${movFrom}-${movTo}`, SOH_PRODUCT_HEADERS, prodMovement, 'حركة المنتجات', `الفترة من ${movFrom} إلى ${movTo}`)
      else exportToExcel(`تقرير-حركة-الأجهزة-${movFrom}-${movTo}`, SOH_DEVICE_HEADERS, devMovement, 'حركة الأجهزة', `الفترة من ${movFrom} إلى ${movTo}`)
    },
  }

  // ── PDF handler ───────────────────────────────────────────────────────────
  async function handlePdf(mode: PdfOutput) {
    setShowPdfModal(false)
    setPdfLoading(true)
    try {
      switch (tab) {
        case 'overview':   exportOverviewPdf({
          output: mode, dateRange, sales, stock, summary: summary ?? null,
          productSales: profitabilityService.select(profitRows, 'product').sort((a, b) => b.units - a.units),
          productStock: prodMovement.filter(p => p.current_stock > 0),
        }); break
        case 'sales':      exportSalesPdf(sales, mode, dateRange); break
        case 'stock':      exportStockPdf(stock, mode); break
        case 'suppliers': {
          const ledger = selectedSupplierId === 'all' ? supplierLedger : supplierLedger.filter(s => s.supplier_id === selectedSupplierId)
          await exportSuppliersPdf(ledger, mode, dateRange); break
        }
        case 'customers':  exportCustomersPdf(customers, mode, dateRange); break
        case 'alerts':     exportAlertsPdf(lowStock, mode); break
        case 'movement':   printMovement(movType, prodMovement, devMovement, movFrom, movTo); break
        case 'productsales': {
          const rows = profitabilityService.select(profitRows, 'product').sort((a, b) => b.units - a.units)
          exportProductSalesPdf(rows, profitabilityService.totals(rows), mode, dateRange); break
        }
        case 'profit':     exportProfitPdf(sales, summary?.totalExpenses ?? 0, mode, dateRange); break
        case 'brands':     exportBrandsPdf(reportAggregates.salesByBrand(sales), reportAggregates.stockByBrand(stock), mode, dateRange); break
        case 'expenses':   exportExpensesPdf(reportAggregates.expensesByCategory(expenses), mode); break
        case 'cashier':    exportCashierPdf(cashierData, mode, dateRange); break
        case 'topprofit': {
          const rows = profitabilityService.select(profitRows, profitKind)
          exportTopProfitPdf(rows, profitabilityService.totals(rows), PROFIT_KIND_LABELS[profitKind], mode, dateRange); break
        }
      }
    } finally { setPdfLoading(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">التقارير</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">تحليل المبيعات والمخزون والأداء</p>
        </div>
        <div className="flex items-center gap-2">
          {PDF_TABS.includes(tab) && <button onClick={() => setShowPdfModal(true)} disabled={pdfLoading}
            className="h-9 px-4 text-sm font-semibold rounded-lg bg-[#0F2552] hover:bg-[#0B1B3F] text-white transition-colors flex items-center gap-2 disabled:opacity-50">
            {pdfLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
            PDF
          </button>}
        </div>

        {/* PDF Modal */}
        {showPdfModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowPdfModal(false) }}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">تصدير PDF</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{dateRange}</p>
              <div className="space-y-3">
                <button onClick={() => void handlePdf('download')}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                  <Download size={16} /> تحميل PDF مباشرة
                </button>
                <button onClick={() => void handlePdf('preview')}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                  <Printer size={16} /> فتح في تاب جديد
                </button>
                <button onClick={() => setShowPdfModal(false)}
                  className="w-full h-9 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ReportNav tab={tab} onChange={setTab} />
      <DateRangeBar from={filterFrom} to={filterTo} onChange={(f, t) => { setFilterFrom(f); setFilterTo(t) }} />

      {/* Tab Content — each tab is a separate component */}
      <Suspense fallback={<div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      {tab === 'overview'  && <OverviewTabContent  {...tabProps} />}
      {tab === 'sales'     && <SalesTabContent     {...tabProps} />}
      {tab === 'stock'     && <StockTabContent     {...tabProps} />}
      {tab === 'suppliers' && <SuppliersTabContent {...tabProps} />}
      {tab === 'customers' && <CustomersTabContent {...tabProps} />}
      {tab === 'alerts'    && <AlertsTabContent    {...tabProps} />}
      {tab === 'movement'  && <MovementTabContent  {...tabProps} />}
      {tab === 'profit'    && <ProfitTabContent       {...tabProps} />}
      {tab === 'brands'    && <BrandsTabContent        {...tabProps} />}
      {tab === 'expenses'  && <ExpensesReportTabContent {...tabProps} />}
      {tab === 'cashier'   && <CashierTabContent        {...tabProps} />}
      {tab === 'pricelist' && <PriceListTabContent                    />}
      {tab === 'productsales' && <ProductSalesTabContent from={filterFrom || undefined} to={filterTo || undefined} />}
      {tab === 'topprofit' && <TopProfitTabContent from={filterFrom || undefined} to={filterTo || undefined} kind={profitKind} onKindChange={setProfitKind} />}
      </Suspense>
    </div>
  )
}
