// src/lib/pdfExport.ts
// PDF export via HTML print window — supports Arabic (Cairo font) correctly
// jsPDF was replaced because it doesn't support Arabic without font embedding

import { fmt } from '@/lib/fmt'
import { formatDateKeyAr } from '@/lib/dateKey'
import { CASH_METHOD_LABELS } from '@/constants/paymentMethods'
import type { DailyClose } from '@/types/dailyClose'

export type PdfOutput = 'download' | 'preview'

// ── Shared styles ─────────────────────────────────────────────────────────────
function baseStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif !important; }
    body { font-size:12px; color:#1a1a1a; direction:rtl; background:#fff; padding:20px 28px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1d4ed8; padding-bottom:14px; margin-bottom:18px; }
    .header h1 { font-size:20px; font-weight:900; color:#1d4ed8; }
    .header p  { color:#6b7280; font-size:11px; margin-top:3px; }
    .header-info { text-align:left; }
    .header-info p { font-size:11px; color:#374151; margin-bottom:2px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
    .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; }
    .kpi .lbl { font-size:10px; color:#6b7280; margin-bottom:3px; }
    .kpi .val { font-size:17px; font-weight:900; color:#1a1a1a; }
    .val.green  { color:#16a34a; }
    .val.red    { color:#dc2626; }
    .val.blue   { color:#2563eb; }
    .val.amber  { color:#d97706; }
    .sec { margin-bottom:22px; }
    .sec-title { font-size:13px; font-weight:700; color:#1d4ed8; border-bottom:1px solid #dbeafe; padding-bottom:5px; margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    th { background:#eff6ff; color:#1d4ed8; font-weight:700; padding:7px 10px; text-align:right; border:1px solid #bfdbfe; white-space:nowrap; }
    td { padding:6px 10px; border:1px solid #e5e7eb; vertical-align:middle; }
    tr:nth-child(even) td { background:#f9fafb; }
    .tot td { background:#eff6ff !important; font-weight:700; color:#1d4ed8; border-top:2px solid #1d4ed8; }
    .footer { margin-top:24px; border-top:1px solid #e5e7eb; padding-top:10px; display:flex; justify-content:space-between; color:#9ca3af; font-size:10px; }
    @media print { @page { margin:15mm; } }
  `
}

function buildHeader(title: string, subtitle: string, dateRange?: string) {
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
  return `
    <div class="header">
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="header-info">
        <p><strong>الشافعي ستور</strong></p>
        <p>📅 ${today}</p>
        ${dateRange ? `<p>📆 ${dateRange}</p>` : ''}
      </div>
    </div>
  `
}

function kpiGrid(items: { label: string; value: string; color?: string }[]) {
  return `
    <div class="kpi-grid">
      ${items.map(i => `
        <div class="kpi">
          <div class="lbl">${i.label}</div>
          <div class="val ${i.color ?? ''}">${i.value}</div>
        </div>
      `).join('')}
    </div>
  `
}

function openWindow(html: string, filename: string, mode: PdfOutput) {
  const full = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>${baseStyles()}</style>
</head>
<body>
  ${html}
  <div class="footer">
    <span>الشافعي ستور — نظام إدارة المحل</span>
    <span>${new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })}</span>
  </div>
  <script>
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        ${mode === 'download' ? "window.print(); setTimeout(function(){ window.close(); }, 1000);" : "window.print();"}
      });
    } else {
      setTimeout(function() {
        window.print();
        ${mode === 'download' ? "setTimeout(function(){ window.close(); }, 1000);" : ""}
      }, 800);
    }
  <\/script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(full)
    win.document.close()
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type SalesRow    = { brand_name: string; model_name: string; total_units: number; total_cost: number; total_revenue: number; profit: number; margin_pct: number }
export type StockRow    = { brand_name: string; model_name: string; count: number; total_cost: number; total_selling: number }
export type SupplierRow = { supplier_name: string; total_devices: number; total_cost: number }
export type CustomerRow = { customer_name: string; device_count: number; total_spent: number }
export type AlertRow    = { product_name: string; category_name: string; stock_qty: number; reorder_level: number; cost_price: number; stock_value: number }
export type InvoiceRow  = { invoice_number: string; invoice_date: string; total_amount: number; paid_amount: number; discount: number; remaining: number }
export type SupplierLedgerRow = { supplier_id: string; supplier_name: string; total_invoiced: number; total_paid: number; balance: number }

export interface PdfReportOptions {
  output:    PdfOutput
  dateRange: string
  sales:     SalesRow[]
  stock:     StockRow[]
  suppliers: SupplierRow[]
  customers: CustomerRow[]
  alerts:    AlertRow[]
  summary:   { totalSoldDevices: number; totalRevenue: number; totalCostSold: number; totalProfit: number; avgMargin: number; stockDevices: number } | null
}

// ── Overview ──────────────────────────────────────────────────────────────────
export function exportOverviewPdf(opts: Pick<PdfReportOptions, 'output' | 'dateRange' | 'sales' | 'stock' | 'summary'>) {
  const { output, dateRange, sales, stock, summary } = opts
  let html = buildHeader('تقرير نظرة عامة — ملخص شامل', 'الشافعي ستور', dateRange)

  if (summary) {
    html += kpiGrid([
      { label: 'إجمالي الإيرادات',       value: `${fmt(summary.totalRevenue)} ج`,  color: 'green' },
      { label: 'إجمالي التكاليف',         value: `${fmt(summary.totalCostSold)} ج`, color: 'red'   },
      { label: 'صافي الربح',              value: `${fmt(summary.totalProfit)} ج`,   color: summary.totalProfit >= 0 ? 'green' : 'red' },
      { label: 'هامش الربح',              value: `${summary.avgMargin?.toFixed(1)}%`, color: 'blue' },
      { label: 'أجهزة مباعة',            value: String(summary.totalSoldDevices) },
      { label: 'في المخزون',              value: String(summary.stockDevices),      color: 'blue'  },
      { label: 'قيمة المخزون (تكلفة)',    value: `${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج`,    color: 'amber' },
      { label: 'ربح متوقع من المخزون',   value: `${fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} ج`, color: 'green' },
    ])
  }

  if (sales.length > 0) {
    html += `<div class="sec"><div class="sec-title">مبيعات الأجهزة حسب الموديل</div>
    <table><thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>وحدات</th><th>التكلفة</th><th>الإيرادات</th><th>الربح</th><th>الهامش %</th></tr></thead><tbody>
    ${sales.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand_name}</td><td>${r.model_name}</td><td>${r.total_units}</td><td>${fmt(r.total_cost)} ج</td><td>${fmt(r.total_revenue)} ج</td><td>${fmt(r.profit)} ج</td><td>${r.margin_pct}%</td></tr>`).join('')}
    <tr class="tot"><td colspan="3"><strong>الإجمالي</strong></td><td>${sales.reduce((s,r)=>s+r.total_units,0)}</td><td>${fmt(sales.reduce((s,r)=>s+r.total_cost,0))} ج</td><td>${fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} ج</td><td>${fmt(sales.reduce((s,r)=>s+r.profit,0))} ج</td><td></td></tr>
    </tbody></table></div>`
  }

  if (stock.length > 0) {
    html += `<div class="sec"><div class="sec-title">المخزون الحالي</div>
    <table><thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>الكمية</th><th>قيمة التكلفة</th><th>قيمة البيع</th><th>الربح المتوقع</th></tr></thead><tbody>
    ${stock.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand_name}</td><td>${r.model_name}</td><td>${r.count}</td><td>${fmt(r.total_cost)} ج</td><td>${fmt(r.total_selling)} ج</td><td>${fmt(r.total_selling-r.total_cost)} ج</td></tr>`).join('')}
    <tr class="tot"><td colspan="3"><strong>الإجمالي</strong></td><td>${stock.reduce((s,r)=>s+r.count,0)}</td><td>${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج</td><td>${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} ج</td><td>${fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} ج</td></tr>
    </tbody></table></div>`
  }

  openWindow(html, `تقرير-نظرة-عامة-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Sales ─────────────────────────────────────────────────────────────────────
export function exportSalesPdf(sales: SalesRow[], output: PdfOutput, dateRange: string) {
  let html = buildHeader('تقرير مبيعات الأجهزة', 'تفاصيل المبيعات والأرباح', dateRange)
  html += kpiGrid([
    { label: 'موديلات مباعة',     value: String(sales.length) },
    { label: 'إجمالي الوحدات',    value: String(sales.reduce((s,r)=>s+r.total_units,0)),      color: 'blue'  },
    { label: 'إجمالي الإيرادات',  value: `${fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} ج`, color: 'green' },
    { label: 'صافي الربح',        value: `${fmt(sales.reduce((s,r)=>s+r.profit,0))} ج`,        color: 'green' },
  ])
  html += `<div class="sec"><div class="sec-title">تفاصيل المبيعات</div>
  <table><thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>وحدات</th><th>التكلفة</th><th>الإيرادات</th><th>الربح</th><th>الهامش %</th></tr></thead><tbody>
  ${sales.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand_name}</td><td>${r.model_name}</td><td>${r.total_units}</td><td>${fmt(r.total_cost)} ج</td><td>${fmt(r.total_revenue)} ج</td><td>${fmt(r.profit)} ج</td><td>${r.margin_pct}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="3"><strong>الإجمالي</strong></td><td>${sales.reduce((s,r)=>s+r.total_units,0)}</td><td>${fmt(sales.reduce((s,r)=>s+r.total_cost,0))} ج</td><td>${fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} ج</td><td>${fmt(sales.reduce((s,r)=>s+r.profit,0))} ج</td><td></td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-مبيعات-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Top profit ────────────────────────────────────────────────────────────────
export type TopProfitPdfRow    = { kind: 'device' | 'product'; name: string; units: number; revenue: number; cost: number; profit: number; margin_pct: number }
export type TopProfitPdfTotals = { units: number; revenue: number; cost: number; profit: number; margin_pct: number }

export function exportTopProfitPdf(rows: TopProfitPdfRow[], totals: TopProfitPdfTotals, scope: string, output: PdfOutput, dateRange: string) {
  let html = buildHeader('تقرير الأكثر ربحاً', scope, dateRange)
  html += kpiGrid([
    { label: 'الوحدات المباعة',     value: fmt(totals.units),            color: 'blue'  },
    { label: 'الإيراد (بعد الخصم)', value: `${fmt(totals.revenue)} ج`,   color: 'green' },
    { label: 'التكلفة',             value: `${fmt(totals.cost)} ج` },
    { label: 'إجمالي الربح',        value: `${fmt(totals.profit)} ج`,    color: 'green' },
  ])
  html += `<div class="sec"><div class="sec-title">الترتيب حسب الربح</div>
  <table><thead><tr><th>#</th><th>الصنف</th><th>النوع</th><th>وحدات</th><th>الإيراد</th><th>التكلفة</th><th>الربح</th><th>النسبة %</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.kind === 'device' ? 'جهاز' : 'منتج'}</td><td>${fmt(r.units)}</td><td>${fmt(r.revenue)} ج</td><td>${fmt(r.cost)} ج</td><td>${fmt(r.profit)} ج</td><td>${r.margin_pct.toFixed(1)}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="3"><strong>الإجمالي</strong></td><td>${fmt(totals.units)}</td><td>${fmt(totals.revenue)} ج</td><td>${fmt(totals.cost)} ج</td><td>${fmt(totals.profit)} ج</td><td>${totals.margin_pct.toFixed(1)}%</td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-الأكثر-ربحا-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Profitability ─────────────────────────────────────────────────────────────
export type ProfitPdfRow = { brand_name: string; model_name: string; total_units: number; total_cost: number; total_revenue: number; profit: number; margin_pct: number }

export function exportProfitPdf(sales: ProfitPdfRow[], totalExpenses: number, output: PdfOutput, dateRange: string) {
  const units  = sales.reduce((s, r) => s + Number(r.total_units), 0)
  const cost   = sales.reduce((s, r) => s + Number(r.total_cost), 0)
  const rev    = sales.reduce((s, r) => s + Number(r.total_revenue), 0)
  const gross  = sales.reduce((s, r) => s + Number(r.profit), 0)
  const net    = gross - totalExpenses
  const margin = rev > 0 ? (net / rev) * 100 : 0
  let html = buildHeader('تقرير الربحية التفصيلية', 'الربح حسب الموديل وصافي الربح', dateRange)
  html += kpiGrid([
    { label: 'الوحدات المباعة',  value: fmt(units),                color: 'blue'  },
    { label: 'التكلفة',          value: `${fmt(cost)} ج` },
    { label: 'المصروفات',        value: `${fmt(totalExpenses)} ج`, color: 'red'   },
    { label: 'صافي الربح',       value: `${fmt(net)} ج`,           color: net >= 0 ? 'green' : 'red' },
  ])
  html += `<div class="sec"><div class="sec-title">تفاصيل الربحية حسب الموديل</div>
  <table><thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>وحدات</th><th>تكلفة الوحدة</th><th>سعر البيع</th><th>ربح الوحدة</th><th>إجمالي الربح</th><th>هامش %</th></tr></thead><tbody>
  ${sales.map((r,i)=>{
    const u = Number(r.total_units)
    const uc = u > 0 ? Number(r.total_cost) / u : 0
    const ur = u > 0 ? Number(r.total_revenue) / u : 0
    return `<tr><td>${i+1}</td><td>${r.brand_name}</td><td>${r.model_name}</td><td>${u}</td><td>${fmt(uc)} ج</td><td>${fmt(ur)} ج</td><td>${fmt(ur-uc)} ج</td><td>${fmt(r.profit)} ج</td><td>${r.margin_pct}%</td></tr>`
  }).join('')}
  <tr class="tot"><td colspan="3"><strong>الربح الإجمالي</strong></td><td>${fmt(units)}</td><td colspan="3"></td><td>${fmt(gross)} ج</td><td></td></tr>
  <tr class="tot"><td colspan="7"><strong>مطروحاً: المصروفات</strong></td><td>− ${fmt(totalExpenses)} ج</td><td></td></tr>
  <tr class="tot"><td colspan="7"><strong>صافي الربح النهائي</strong></td><td>${fmt(net)} ج</td><td>${margin.toFixed(1)}%</td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-الربحية-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Brands ────────────────────────────────────────────────────────────────────
export type BrandSalesPdfRow = { brand: string; units: number; revenue: number; cost: number; profit: number }
export type BrandStockPdfRow = { brand: string; count: number; cost_value: number; sell_value: number }

export function exportBrandsPdf(sales: BrandSalesPdfRow[], stock: BrandStockPdfRow[], output: PdfOutput, dateRange: string) {
  const units  = sales.reduce((s, r) => s + r.units, 0)
  const rev    = sales.reduce((s, r) => s + r.revenue, 0)
  const profit = sales.reduce((s, r) => s + r.profit, 0)
  const stockUnits = stock.reduce((s, r) => s + r.count, 0)
  const stockCost  = stock.reduce((s, r) => s + r.cost_value, 0)
  const stockSell  = stock.reduce((s, r) => s + r.sell_value, 0)
  const pct = (v: number, t: number) => (t > 0 ? ((v / t) * 100).toFixed(1) : '0')
  let html = buildHeader('تقرير تحليل البراندات', 'المبيعات والمخزون حسب البراند', dateRange)
  html += kpiGrid([
    { label: 'براندات مباعة',     value: String(sales.length) },
    { label: 'الوحدات المباعة',   value: fmt(units),         color: 'blue'  },
    { label: 'الإيرادات',         value: `${fmt(rev)} ج`,    color: 'green' },
    { label: 'صافي الربح',        value: `${fmt(profit)} ج`, color: 'green' },
  ])
  html += `<div class="sec"><div class="sec-title">أداء البراندات — المبيعات</div>
  <table><thead><tr><th>#</th><th>البراند</th><th>وحدات</th><th>إيرادات</th><th>ربح</th><th>حصة %</th></tr></thead><tbody>
  ${sales.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand}</td><td>${fmt(r.units)}</td><td>${fmt(r.revenue)} ج</td><td>${fmt(r.profit)} ج</td><td>${pct(r.units, units)}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="2"><strong>الإجمالي</strong></td><td>${fmt(units)}</td><td>${fmt(rev)} ج</td><td>${fmt(profit)} ج</td><td></td></tr>
  </tbody></table></div>`
  html += `<div class="sec"><div class="sec-title">البراندات — المخزون الحالي</div>
  <table><thead><tr><th>#</th><th>البراند</th><th>وحدات</th><th>قيمة التكلفة</th><th>قيمة البيع</th><th>حصة %</th></tr></thead><tbody>
  ${stock.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand}</td><td>${fmt(r.count)}</td><td>${fmt(r.cost_value)} ج</td><td>${fmt(r.sell_value)} ج</td><td>${pct(r.count, stockUnits)}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="2"><strong>الإجمالي</strong></td><td>${fmt(stockUnits)}</td><td>${fmt(stockCost)} ج</td><td>${fmt(stockSell)} ج</td><td></td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-البراندات-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export type ExpenseCategoryPdfRow = { name: string; total: number; count: number }

export function exportExpensesPdf(byCategory: ExpenseCategoryPdfRow[], output: PdfOutput) {
  const total = byCategory.reduce((s, r) => s + r.total, 0)
  const count = byCategory.reduce((s, r) => s + r.count, 0)
  let html = buildHeader('تقرير المصروفات', 'المصروفات حسب الفئة', 'كل الفترات')
  html += kpiGrid([
    { label: 'إجمالي المصروفات', value: `${fmt(total)} ج`, color: 'red' },
    { label: 'عدد المصروفات',    value: fmt(count) },
    { label: 'عدد الفئات',       value: String(byCategory.length) },
  ])
  html += `<div class="sec"><div class="sec-title">المصروفات حسب الفئة</div>
  <table><thead><tr><th>#</th><th>الفئة</th><th>العدد</th><th>الإجمالي</th><th>النسبة %</th></tr></thead><tbody>
  ${byCategory.map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${fmt(r.count)}</td><td>${fmt(r.total)} ج</td><td>${total > 0 ? ((r.total / total) * 100).toFixed(1) : '0'}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="2"><strong>الإجمالي</strong></td><td>${fmt(count)}</td><td>${fmt(total)} ج</td><td></td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-المصروفات-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Cashier ───────────────────────────────────────────────────────────────────
export type CashierPdfRow = { cashier_name: string; invoice_count: number; total_devices: number; total_products: number; total_revenue: number; avg_invoice: number }

export function exportCashierPdf(rows: CashierPdfRow[], output: PdfOutput, dateRange: string) {
  const rev      = rows.reduce((s, r) => s + r.total_revenue, 0)
  const invoices = rows.reduce((s, r) => s + r.invoice_count, 0)
  let html = buildHeader('تقرير أداء الكاشير', 'أداء الموظفين في المبيعات', dateRange)
  html += kpiGrid([
    { label: 'عدد الكاشيرات',    value: String(rows.length) },
    { label: 'إجمالي الفواتير',  value: fmt(invoices),    color: 'blue'  },
    { label: 'إجمالي الإيرادات', value: `${fmt(rev)} ج`,  color: 'green' },
    { label: 'الأفضل أداءً',     value: rows[0]?.cashier_name ?? '—' },
  ])
  html += `<div class="sec"><div class="sec-title">أداء الكاشيرات التفصيلي</div>
  <table><thead><tr><th>#</th><th>الموظف</th><th>فواتير</th><th>أجهزة</th><th>منتجات</th><th>الإيرادات</th><th>متوسط الفاتورة</th><th>الحصة %</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.cashier_name}</td><td>${fmt(r.invoice_count)}</td><td>${fmt(r.total_devices)}</td><td>${fmt(r.total_products)}</td><td>${fmt(r.total_revenue)} ج</td><td>${fmt(r.avg_invoice)} ج</td><td>${rev > 0 ? ((r.total_revenue / rev) * 100).toFixed(1) : '0'}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="2"><strong>الإجمالي</strong></td><td>${fmt(invoices)}</td><td colspan="2"></td><td>${fmt(rev)} ج</td><td colspan="2"></td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-الكاشير-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Device price list ─────────────────────────────────────────────────────────
export type PriceListPdfRow = { brand_name: string; model_name: string; imei1: string; storage: string; color: string; status_label: string; cost_price: number; selling_price: number; profit: number }

export function exportPriceListPdf(rows: PriceListPdfRow[], scope: string, output: PdfOutput) {
  const cost = rows.reduce((s, r) => s + r.cost_price, 0)
  const sell = rows.reduce((s, r) => s + r.selling_price, 0)
  let html = buildHeader('قائمة أسعار الأجهزة', scope)
  html += kpiGrid([
    { label: 'عدد الأجهزة',        value: fmt(rows.length) },
    { label: 'إجمالي سعر الشراء',  value: `${fmt(cost)} ج` },
    { label: 'إجمالي سعر البيع',   value: `${fmt(sell)} ج`, color: 'green' },
    { label: 'إجمالي الفرق',       value: `${fmt(sell - cost)} ج`, color: 'green' },
  ])
  html += `<div class="sec"><div class="sec-title">قائمة الأجهزة</div>
  <table><thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>IMEI</th><th>التخزين</th><th>اللون</th><th>الحالة</th><th>سعر الشراء</th><th>سعر البيع</th><th>الفرق</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand_name}</td><td>${r.model_name}</td><td>${r.imei1}</td><td>${r.storage}</td><td>${r.color}</td><td>${r.status_label}</td><td>${fmt(r.cost_price)} ج</td><td>${fmt(r.selling_price)} ج</td><td>${fmt(r.profit)} ج</td></tr>`).join('')}
  <tr class="tot"><td colspan="7"><strong>الإجمالي</strong></td><td>${fmt(cost)} ج</td><td>${fmt(sell)} ج</td><td>${fmt(sell - cost)} ج</td></tr>
  </tbody></table></div>`
  openWindow(html, `قائمة-أسعار-الأجهزة-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Product sales ─────────────────────────────────────────────────────────────
export type ProductSalesPdfRow = { name: string; subtitle: string; units: number; revenue: number; cost: number; profit: number; margin_pct: number }

export function exportProductSalesPdf(rows: ProductSalesPdfRow[], totals: TopProfitPdfTotals, output: PdfOutput, dateRange: string) {
  let html = buildHeader('تقرير مبيعات المنتجات', 'إكسسوارات وقطع غيار حسب الصنف', dateRange)
  html += kpiGrid([
    { label: 'أصناف مباعة',     value: fmt(rows.length) },
    { label: 'إجمالي الوحدات',  value: fmt(totals.units),          color: 'blue'  },
    { label: 'إجمالي الإيرادات', value: `${fmt(totals.revenue)} ج`, color: 'green' },
    { label: 'صافي الربح',      value: `${fmt(totals.profit)} ج`,  color: 'green' },
  ])
  html += `<div class="sec"><div class="sec-title">مبيعات المنتجات حسب الصنف</div>
  <table><thead><tr><th>#</th><th>الصنف</th><th>التصنيف</th><th>وحدات</th><th>التكلفة</th><th>الإيرادات</th><th>الربح</th><th>هامش %</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.subtitle}</td><td>${fmt(r.units)}</td><td>${fmt(r.cost)} ج</td><td>${fmt(r.revenue)} ج</td><td>${fmt(r.profit)} ج</td><td>${r.margin_pct.toFixed(1)}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="3"><strong>الإجمالي</strong></td><td>${fmt(totals.units)}</td><td>${fmt(totals.cost)} ج</td><td>${fmt(totals.revenue)} ج</td><td>${fmt(totals.profit)} ج</td><td>${totals.margin_pct.toFixed(1)}%</td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-مبيعات-المنتجات-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Stock ─────────────────────────────────────────────────────────────────────
export function exportStockPdf(stock: StockRow[], output: PdfOutput) {
  let html = buildHeader('تقرير مخزون الأجهزة', 'الأجهزة المتاحة وقيمتها')
  html += kpiGrid([
    { label: 'موديلات في المخزون',      value: String(stock.length) },
    { label: 'إجمالي الوحدات',          value: String(stock.reduce((s,r)=>s+r.count,0)),         color: 'blue'  },
    { label: 'قيمة التكلفة',            value: `${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج`,    color: 'amber' },
    { label: 'قيمة البيع المتوقعة',     value: `${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} ج`, color: 'green' },
  ])
  html += `<div class="sec"><div class="sec-title">تفاصيل المخزون</div>
  <table><thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>الكمية</th><th>قيمة التكلفة</th><th>قيمة البيع المتوقعة</th><th>الربح المتوقع</th></tr></thead><tbody>
  ${stock.map((r,i)=>`<tr><td>${i+1}</td><td>${r.brand_name}</td><td>${r.model_name}</td><td>${r.count}</td><td>${fmt(r.total_cost)} ج</td><td>${fmt(r.total_selling)} ج</td><td>${fmt(r.total_selling-r.total_cost)} ج</td></tr>`).join('')}
  <tr class="tot"><td colspan="3"><strong>الإجمالي</strong></td><td>${stock.reduce((s,r)=>s+r.count,0)}</td><td>${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج</td><td>${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} ج</td><td>${fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} ج</td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-مخزون-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
export async function exportSuppliersPdf(suppliersLedger: SupplierLedgerRow[], output: PdfOutput, dateRange: string) {
  const { paymentsService } = await import('@/services/payments.service')
  let html = buildHeader('تقرير الموردين', 'كشف حساب تفصيلي لكل مورد', dateRange)

  for (const s of suppliersLedger) {
    html += `<div class="sec"><div class="sec-title">المورد: ${s.supplier_name}</div>`
    html += kpiGrid([
      { label: 'إجمالي الفواتير', value: `${fmt(s.total_invoiced)} ج`, color: 'red'   },
      { label: 'إجمالي المدفوع',  value: `${fmt(s.total_paid)} ج`,    color: 'green' },
      { label: s.balance < 0 ? 'رصيد دائن' : 'المتبقي', value: `${fmt(Math.abs(s.balance))} ج`, color: s.balance < 0 ? 'blue' : s.balance > 0 ? 'red' : 'green' },
      { label: 'الحالة', value: s.balance < 0 ? 'رصيد دائن' : s.balance > 0 ? 'مديونية' : 'مسدد', color: s.balance < 0 ? 'blue' : s.balance > 0 ? 'red' : 'green' },
    ])
    let invoices: InvoiceRow[] = []
    try { invoices = await paymentsService.getPurchaseInvoicesBySupplier(s.supplier_id) as InvoiceRow[] } catch { /* skip */ }
    if (invoices.length > 0) {
      html += `<table><thead><tr><th>#</th><th>رقم الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>الخصم</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>
      ${invoices.map((inv,i)=>`<tr><td>${i+1}</td><td>${inv.invoice_number}</td><td>${new Date(inv.invoice_date).toLocaleDateString('ar-EG')}</td><td>${fmt(inv.total_amount)} ج</td><td>${inv.discount>0?fmt(inv.discount)+' ج':'--'}</td><td>${fmt(inv.paid_amount)} ج</td><td>${inv.remaining<0?`رصيد دائن ${fmt(Math.abs(inv.remaining))} ج`:inv.remaining>0?`${fmt(inv.remaining)} ج`:'مسدد'}</td></tr>`).join('')}
      <tr class="tot"><td colspan="3"><strong>الإجمالي</strong></td><td>${fmt(invoices.reduce((x,i)=>x+i.total_amount,0))} ج</td><td>${fmt(invoices.reduce((x,i)=>x+i.discount,0))} ج</td><td>${fmt(invoices.reduce((x,i)=>x+i.paid_amount,0))} ج</td><td>${fmt(invoices.reduce((x,i)=>x+i.remaining,0))} ج</td></tr>
      </tbody></table>`
    }
    html += `</div>`
  }
  openWindow(html, `تقرير-الموردين-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Customers ─────────────────────────────────────────────────────────────────
export function exportCustomersPdf(customers: CustomerRow[], output: PdfOutput, dateRange: string) {
  const total = customers.reduce((s,r)=>s+r.total_spent,0)
  let html = buildHeader('تقرير العملاء', 'أفضل العملاء والمبيعات', dateRange)
  html += kpiGrid([
    { label: 'عدد العملاء',       value: String(customers.length) },
    { label: 'إجمالي الأجهزة',   value: String(customers.reduce((s,r)=>s+r.device_count,0)), color: 'blue' },
    { label: 'إجمالي المبيعات',  value: `${fmt(total)} ج`, color: 'green' },
    { label: 'متوسط لكل عميل',   value: `${fmt(customers.length ? total/customers.length : 0)} ج`, color: 'amber' },
  ])
  html += `<div class="sec"><div class="sec-title">أفضل العملاء</div>
  <table><thead><tr><th>#</th><th>العميل</th><th>أجهزة مشتراة</th><th>إجمالي الإنفاق</th><th>متوسط الجهاز</th><th>النسبة %</th></tr></thead><tbody>
  ${customers.map((r,i)=>`<tr><td>${i+1}</td><td>${r.customer_name}</td><td>${r.device_count}</td><td>${fmt(r.total_spent)} ج</td><td>${fmt(r.device_count>0?r.total_spent/r.device_count:0)} ج</td><td>${total>0?((r.total_spent/total)*100).toFixed(1):0}%</td></tr>`).join('')}
  <tr class="tot"><td colspan="2"><strong>الإجمالي</strong></td><td>${customers.reduce((s,r)=>s+r.device_count,0)}</td><td>${fmt(total)} ج</td><td></td><td>100%</td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-عملاء-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export function exportAlertsPdf(alerts: AlertRow[], output: PdfOutput) {
  let html = buildHeader('تقرير تنبيهات المخزون', 'منتجات تحتاج إعادة طلب')
  html += kpiGrid([
    { label: 'منتجات تحت الحد',      value: String(alerts.length),                             color: 'red'   },
    { label: 'نفذ من المخزون',        value: String(alerts.filter(r=>r.stock_qty===0).length), color: 'red'   },
    { label: 'تحت الحد الأدنى',      value: String(alerts.filter(r=>r.stock_qty>0).length),   color: 'amber' },
    { label: 'قيمة المخزون المنخفض', value: `${fmt(alerts.reduce((s,r)=>s+r.stock_value,0))} ج`, color: 'amber' },
  ])
  html += `<div class="sec"><div class="sec-title">قائمة المنتجات التي تحتاج إعادة طلب</div>
  <table><thead><tr><th>#</th><th>المنتج</th><th>الفئة</th><th>الرصيد الحالي</th><th>الحد الأدنى</th><th>العجز</th><th>سعر التكلفة</th><th>قيمة المخزون</th></tr></thead><tbody>
  ${alerts.map((r,i)=>`<tr><td>${i+1}</td><td>${r.product_name}</td><td>${r.category_name}</td><td>${r.stock_qty}</td><td>${r.reorder_level}</td><td style="color:#dc2626;font-weight:700">-${Math.max(0,r.reorder_level-r.stock_qty)}</td><td>${fmt(r.cost_price)} ج</td><td>${fmt(r.stock_value)} ج</td></tr>`).join('')}
  <tr class="tot"><td colspan="7"><strong>إجمالي قيمة المخزون المنخفض</strong></td><td>${fmt(alerts.reduce((s,r)=>s+r.stock_value,0))} ج</td></tr>
  </tbody></table></div>`
  openWindow(html, `تقرير-تنبيهات-${new Date().toISOString().split('T')[0]}`, output)
}

// ── Daily close ───────────────────────────────────────────────────────────────
export function exportDailyClosePdf(d: DailyClose, output: PdfOutput) {
  const profitColor = d.netProfit >= 0 ? 'green' : 'red'
  const cashColor   = d.cash.net   >= 0 ? 'green' : 'red'

  let html = buildHeader('إقفال اليوم', 'ملخص النقدية والمبيعات والأرباح والمتبقي عند العملاء', formatDateKeyAr(d.date))
  html += kpiGrid([
    { label: 'صافي النقدية',      value: `${fmt(d.cash.net)} ج`,                    color: cashColor   },
    { label: 'إجمالي المبيعات',   value: `${fmt(d.sales.revenue)} ج`,               color: 'blue'      },
    { label: 'صافي الربح',        value: `${fmt(d.netProfit)} ج`,                   color: profitColor },
    { label: 'المتبقي عند العملاء', value: `${fmt(d.receivables.totalOutstanding)} ج`, color: 'amber'  },
  ])

  html += `<div class="sec"><div class="sec-title">حركة النقدية</div>
  <table><thead><tr><th>الوسيلة</th><th>داخل</th><th>خارج</th><th>الصافي</th></tr></thead><tbody>
  ${d.cash.byMethod.map(r => `<tr><td>${CASH_METHOD_LABELS[r.method]}</td><td>${fmt(r.cashIn)} ج</td><td>${fmt(r.cashOut)} ج</td><td>${fmt(r.net)} ج</td></tr>`).join('')}
  <tr class="tot"><td>الإجمالي</td><td>${fmt(d.cash.totalIn)} ج</td><td>${fmt(d.cash.totalOut)} ج</td><td>${fmt(d.cash.net)} ج</td></tr>
  </tbody></table>
  <table style="margin-top:8px"><tbody>
    <tr><td>محصّل من مبيعات اليوم</td><td>${fmt(d.cash.fromTodaySales)} ج</td></tr>
    <tr><td>محصّل من فواتير سابقة</td><td>${fmt(d.cash.fromOlderInvoices)} ج</td></tr>
    <tr><td>مدفوع للموردين</td><td>${fmt(d.cash.toSuppliers)} ج</td></tr>
    <tr><td>مصروفات</td><td>${fmt(d.cash.expenses)} ج</td></tr>
  </tbody></table></div>`

  html += `<div class="sec"><div class="sec-title">المبيعات والأرباح</div>
  <table><tbody>
    <tr><td>عدد فواتير البيع</td><td>${d.sales.invoiceCount}</td></tr>
    <tr><td>إجمالي المبيعات (بعد الخصم)</td><td>${fmt(d.sales.revenue)} ج</td></tr>
    <tr><td>الخصومات</td><td>${fmt(d.sales.discount)} ج</td></tr>
    <tr><td>تكلفة البضاعة المباعة</td><td>${fmt(d.sales.costOfGoods)} ج</td></tr>
    <tr><td>مجمل الربح (${d.sales.marginPct}%)</td><td>${fmt(d.sales.grossProfit)} ج</td></tr>
    <tr><td>المصروفات</td><td>${fmt(d.expenses.total)} ج</td></tr>
    <tr class="tot"><td>صافي الربح</td><td>${fmt(d.netProfit)} ج</td></tr>
  </tbody></table></div>`

  if (d.sales.invoices.length > 0) {
    html += `<div class="sec"><div class="sec-title">فواتير البيع</div>
    <table><thead><tr><th>الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>
    ${d.sales.invoices.map(i => `<tr><td>${i.number}</td><td>${i.customerName ?? 'نقدي'}</td><td>${fmt(i.total)} ج</td><td>${fmt(i.paid)} ج</td><td>${i.remaining > 0 ? `${fmt(i.remaining)} ج` : '—'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="sec"><div class="sec-title">الأصناف المباعة (قبل الخصم)</div>
    <table><thead><tr><th>الصنف</th><th>النوع</th><th>الكمية</th><th>المبلغ</th></tr></thead><tbody>
    ${d.sales.items.map(it => `<tr><td>${it.name}</td><td>${it.kind === 'device' ? 'جهاز' : 'إكسسوار / قطعة'}</td><td>${fmt(it.quantity)}</td><td>${fmt(it.amount)} ج</td></tr>`).join('')}
    <tr class="tot"><td colspan="2">أجهزة: ${fmt(d.sales.devices.quantity)} (${fmt(d.sales.devices.amount)} ج) — إكسسوارات: ${fmt(d.sales.products.quantity)} (${fmt(d.sales.products.amount)} ج)</td><td></td><td></td></tr>
    </tbody></table></div>`
  }

  html += `<div class="sec"><div class="sec-title">المشتريات</div>
  <table><tbody>
    <tr><td>عدد فواتير الشراء</td><td>${d.purchases.invoiceCount}</td></tr>
    <tr><td>إجمالي المشتريات</td><td>${fmt(d.purchases.total)} ج</td></tr>
    <tr><td>المدفوع منها</td><td>${fmt(d.purchases.paid)} ج</td></tr>
  </tbody></table>
  ${d.purchases.invoices.length > 0 ? `<table style="margin-top:8px"><thead><tr><th>الفاتورة</th><th>المورد</th><th>الإجمالي</th><th>المدفوع</th></tr></thead><tbody>
  ${d.purchases.invoices.map(i => `<tr><td>${i.number}</td><td>${i.supplierName}</td><td>${fmt(i.total)} ج</td><td>${fmt(i.paid)} ج</td></tr>`).join('')}
  </tbody></table>` : ''}</div>`

  html += `<div class="sec"><div class="sec-title">المستحق للموردين</div>
  <table><tbody>
    <tr><td>إجمالي المستحق</td><td>${fmt(d.payables.totalOutstanding)} ج (${d.payables.creditorCount} مورد)</td></tr>
  </tbody></table>
  ${d.payables.topCreditors.length > 0 ? `<table style="margin-top:8px"><thead><tr><th>المورد</th><th>الهاتف</th><th>المستحق</th></tr></thead><tbody>
  ${d.payables.topCreditors.map(c => `<tr><td>${c.name}</td><td>${c.phone ?? '—'}</td><td>${fmt(c.balance)} ج</td></tr>`).join('')}
  </tbody></table>` : ''}</div>`

  if (d.expenses.byCategory.length > 0) {
    html += `<div class="sec"><div class="sec-title">المصروفات حسب البند</div>
    <table><thead><tr><th>البند</th><th>المبلغ</th></tr></thead><tbody>
    ${d.expenses.byCategory.map(c => `<tr><td>${c.name}</td><td>${fmt(c.amount)} ج</td></tr>`).join('')}
    </tbody></table></div>`
  }

  html += `<div class="sec"><div class="sec-title">المتبقي عند العملاء</div>
  <table><tbody>
    <tr><td>إجمالي المتبقي</td><td>${fmt(d.receivables.totalOutstanding)} ج (${d.receivables.debtorCount} عميل)</td></tr>
    <tr><td>آجل جديد اليوم</td><td>${fmt(d.receivables.newToday)} ج</td></tr>
  </tbody></table>
  ${d.receivables.topDebtors.length > 0 ? `<table style="margin-top:8px"><thead><tr><th>العميل</th><th>الهاتف</th><th>المتبقي</th></tr></thead><tbody>
  ${d.receivables.topDebtors.map(r => `<tr><td>${r.name}</td><td>${r.phone ?? '—'}</td><td>${fmt(r.balance)} ج</td></tr>`).join('')}
  </tbody></table>` : ''}</div>`

  const page = `<style>.dc{max-width:800px;margin:0 auto} .dc table.kv td:first-child{width:60%;color:#374151}</style><div class="dc">${html.replace(/<table( style="margin-top:8px")?><tbody>/g, (_m, st) => `<table class="kv"${st ?? ''}><tbody>`)}</div>`
  openWindow(page, `إقفال-يوم-${d.date}`, output)
}
