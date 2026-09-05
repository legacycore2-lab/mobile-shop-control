// src/pages/reports/ReportsPage.tsx
// ── Lean shell — state, hooks, routing only ───────────────────────────────────
import { useState } from 'react'
import {
  TrendingUp, Package, Truck, Users,
  DollarSign, BarChart2, AlertTriangle,
  RefreshCw, Download, Calendar, X, Printer,
} from 'lucide-react'
import {
  useReportSummary, useDeviceSalesReport, useStockValueReport,
  useSupplierPurchasesReport, useDailyActivityReport, useLowStockReport,
  useTopCustomersReport, useProductMovementReport, useDeviceMovementReport,
} from '@/hooks/useReports'
import { useSupplierLedger } from '@/hooks/usePayments'
import { cn } from '@/lib/cn'
import { fmt } from '@/constants/statusMaps'
import { exportToExcel, SOH_PRODUCT_HEADERS, SOH_DEVICE_HEADERS } from '@/lib/exportUtils'
import {
  exportOverviewPdf, exportSalesPdf, exportStockPdf,
  exportSuppliersPdf, exportCustomersPdf, exportAlertsPdf,
  type PdfOutput,
} from '@/lib/pdfExport'
import {
  printOverview, printSales, printStock,
  printSuppliers, printCustomers, printAlerts, printMovement,
} from './print/printEngine'
import { KpiCard, BarChart } from './components/ReportWidgets'
import { OverviewTabContent }  from './tabs/OverviewTab'
import { SalesTabContent }     from './tabs/SalesTab'
import { StockTabContent }     from './tabs/StockTab'
import { SuppliersTabContent } from './tabs/SuppliersTab'
import { CustomersTabContent } from './tabs/CustomersTab'
import { AlertsTabContent }    from './tabs/AlertsTab'
import { MovementTabContent }  from './tabs/MovementTab'
import type { Tab } from './types'

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: 'overview',   label: 'نظرة عامة',         icon: BarChart2      },
  { value: 'sales',      label: 'مبيعات الأجهزة',    icon: TrendingUp     },
  { value: 'stock',      label: 'المخزون',             icon: Package        },
  { value: 'suppliers',  label: 'الموردون',            icon: Truck          },
  { value: 'customers',  label: 'العملاء',             icon: Users          },
  { value: 'alerts',     label: 'التنبيهات',           icon: AlertTriangle  },
  { value: 'movement',   label: 'SOH + حركة المخزون', icon: RefreshCw      },
]

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [tab,    setTab]    = useState<Tab>('overview')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all')
  const [filterFrom, setFilterFrom] = useState<string>('')
  const [filterTo,   setFilterTo]   = useState<string>('')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfLoading,   setPdfLoading]   = useState(false)

  const dateRange = filterFrom && filterTo
    ? `من ${filterFrom} إلى ${filterTo}`
    : filterFrom ? `من ${filterFrom}` : filterTo ? `إلى ${filterTo}` : 'كل البيانات'

  // ── Data hooks ────────────────────────────────────────────────────────────
  const { data: summary,      isLoading: sumLoad  } = useReportSummary()
  const { data: sales = [],   isLoading: saleLoad } = useDeviceSalesReport(filterFrom || undefined, filterTo || undefined)
  const { data: stock = [],   isLoading: stckLoad } = useStockValueReport()
  const { data: suppliers = [], isLoading: supLoad } = useSupplierPurchasesReport(filterFrom || undefined, filterTo || undefined)
  const { data: activity = [], isLoading: actLoad } = useDailyActivityReport()
  const { data: lowStock = [], isLoading: lowLoad } = useLowStockReport()
  const { data: customers = [], isLoading: custLoad } = useTopCustomersReport(filterFrom || undefined, filterTo || undefined)
  const { data: supplierLedger = [] } = useSupplierLedger()

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
    saleLoad, stckLoad, supLoad, actLoad, lowLoad, custLoad, prodMovLoad, devMovLoad,
    movFrom, movTo, movType, setMovFrom, setMovTo, setMovType,
    selectedSupplierId, setSelectedSupplierId,
    refetchProd, refetchDev,
    filterFrom, filterTo,
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
        case 'overview':   exportOverviewPdf({ output: mode, dateRange, sales, stock, summary: summary ?? null }); break
        case 'sales':      exportSalesPdf(sales, mode, dateRange); break
        case 'stock':      exportStockPdf(stock, mode); break
        case 'suppliers': {
          const ledger = selectedSupplierId === 'all' ? supplierLedger : supplierLedger.filter(s => s.supplier_id === selectedSupplierId)
          await exportSuppliersPdf(ledger, mode, dateRange); break
        }
        case 'customers':  exportCustomersPdf(customers, mode, dateRange); break
        case 'alerts':     exportAlertsPdf(lowStock, mode); break
        case 'movement':   printMovement(movType, prodMovement, devMovement, movFrom, movTo); break
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
          {/* Date filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
            <Calendar size={13} className="text-gray-400 flex-shrink-0" />
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="h-7 text-xs bg-transparent text-gray-900 dark:text-white focus:outline-none w-28" />
            <span className="text-gray-300 text-xs">—</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="h-7 text-xs bg-transparent text-gray-900 dark:text-white focus:outline-none w-28" />
            {(filterFrom || filterTo) && (
              <button onClick={() => { setFilterFrom(''); setFilterTo('') }}
                className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          <button onClick={() => setShowPdfModal(true)} disabled={pdfLoading}
            className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50">
            {pdfLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
            PDF
          </button>
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

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setTab(value)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg transition-all whitespace-nowrap',
              tab === value
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content — each tab is a separate component */}
      {tab === 'overview'  && <OverviewTabContent  {...tabProps} />}
      {tab === 'sales'     && <SalesTabContent     {...tabProps} />}
      {tab === 'stock'     && <StockTabContent     {...tabProps} />}
      {tab === 'suppliers' && <SuppliersTabContent {...tabProps} />}
      {tab === 'customers' && <CustomersTabContent {...tabProps} />}
      {tab === 'alerts'    && <AlertsTabContent    {...tabProps} />}
      {tab === 'movement'  && <MovementTabContent  {...tabProps} />}
    </div>
  )
}
