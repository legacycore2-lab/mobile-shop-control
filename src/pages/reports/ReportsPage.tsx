import { useState, useMemo } from 'react'
import {
  TrendingUp, Package, Truck, Users,
  DollarSign, BarChart2, AlertTriangle,
  RefreshCw, ChevronUp, ChevronDown, Minus,
  Download, Calendar, Smartphone, Tag, Printer, X,
} from 'lucide-react'
import {
  useReportSummary,
  useDeviceSalesReport,
  useStockValueReport,
  useSupplierPurchasesReport,
  useDailyActivityReport,
  useLowStockReport,
  useTopCustomersReport,
  useProductMovementReport,
  useDeviceMovementReport,
} from '@/hooks/useReports'
import { useSupplierLedger } from '@/hooks/usePayments'
import {
  exportOverviewPdf, exportSalesPdf, exportStockPdf,
  exportSuppliersPdf, exportCustomersPdf, exportAlertsPdf,
  type PdfOutput,
} from '@/lib/pdfExport'
import { Badge } from '@/components/ui/Badge'
import { exportToExcel, SOH_PRODUCT_HEADERS, SOH_DEVICE_HEADERS } from '@/lib/exportUtils'
import { cn } from '@/lib/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined) {
  const num = Number(n ?? 0)
  return isNaN(num) ? '0' : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}ك`
  return String(n)
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_stock:       { label: 'في المخزون',  color: 'bg-blue-500'   },
  sold:           { label: 'مباع',        color: 'bg-green-500'  },
  sent_to_repair: { label: 'في الصيانة', color: 'bg-amber-500'  },
  defective:      { label: 'تالف',        color: 'bg-red-500'    },
  returned:       { label: 'مُعاد',       color: 'bg-purple-500' },
}

const MONTH_NAMES = ['يناير','فبراير','مارس','إبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

// ── Print Engine ──────────────────────────────────────────────────────────────

function printStyles() {
  return `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; font-size:12px; color:#1a1a1a; direction:rtl; background:#fff; }
    .page { padding:20px 28px; max-width:1100px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1d4ed8; padding-bottom:14px; margin-bottom:18px; }
    .header-title h1 { font-size:20px; font-weight:800; color:#1d4ed8; }
    .header-title p { color:#6b7280; font-size:11px; margin-top:3px; }
    .header-info p { font-size:11px; color:#374151; margin-bottom:2px; text-align:left; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
    .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; }
    .kpi .label { font-size:10px; color:#6b7280; margin-bottom:3px; }
    .kpi .value { font-size:18px; font-weight:800; color:#1a1a1a; }
    .kpi .value.green { color:#16a34a; }
    .kpi .value.red   { color:#dc2626; }
    .kpi .value.blue  { color:#2563eb; }
    .kpi .value.amber { color:#d97706; }
    .section { margin-bottom:22px; }
    .section-title { font-size:13px; font-weight:700; color:#1d4ed8; border-bottom:1px solid #dbeafe; padding-bottom:5px; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    th { background:#eff6ff; color:#1d4ed8; font-weight:700; padding:7px 10px; text-align:right; border:1px solid #bfdbfe; white-space:nowrap; }
    td { padding:6px 10px; border:1px solid #e5e7eb; vertical-align:middle; }
    tr:nth-child(even) td { background:#f9fafb; }
    .total-row td { background:#eff6ff!important; font-weight:700; border-top:2px solid #1d4ed8; }
    .badge { display:inline-block; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
    .badge-red    { background:#fee2e2; color:#dc2626; }
    .badge-green  { background:#dcfce7; color:#16a34a; }
    .badge-blue   { background:#dbeafe; color:#2563eb; }
    .badge-amber  { background:#fef3c7; color:#d97706; }
    .badge-purple { background:#f3e8ff; color:#7c3aed; }
    .alert-row td { background:#fff7ed!important; }
    .profit-pos { color:#16a34a; font-weight:700; }
    .profit-neg { color:#dc2626; font-weight:700; }
    .footer { margin-top:24px; border-top:1px solid #e5e7eb; padding-top:10px; display:flex; justify-content:space-between; color:#9ca3af; font-size:10px; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  `
}

function printHeader(title: string, subtitle: string, dateRange?: string) {
  const today = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })
  return `
    <div class="header">
      <div class="header-title">
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="header-info">
        <p><strong>Mobile Shop Control</strong></p>
        <p>📅 ${today}</p>
        ${dateRange ? `<p>📆 ${dateRange}</p>` : ''}
      </div>
    </div>
  `
}

function openPrint(body: string, title: string, dateRange?: string) {
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8"><title>${title}</title>
    <style>${printStyles()}</style>
  </head><body><div class="page">
    ${printHeader(title, 'Mobile Shop Control — نظام إدارة المحل', dateRange)}
    ${body}
    <div class="footer">
      <span>Mobile Shop Control — نظام إدارة المحل</span>
      <span>${title} — ${new Date().toLocaleDateString('ar-EG')}</span>
    </div>
  </div><script>window.onload=()=>window.print()</script></body></html>`
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Print functions per tab ───────────────────────────────────────────────────

function printOverview(summary: Record<string, number> | undefined, sales: unknown[], stock: unknown[], suppliers: unknown[]) {
  if (!summary) return
  const totalStockCost    = (stock as {total_cost:number}[]).reduce((s,r)=>s+r.total_cost,0)
  const totalStockSelling = (stock as {total_selling:number}[]).reduce((s,r)=>s+r.total_selling,0)
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">إجمالي الإيرادات</div><div class="value green">${fmt(summary.totalRevenue)} ج</div></div>
      <div class="kpi"><div class="label">إجمالي التكاليف</div><div class="value red">${fmt(summary.totalCostSold)} ج</div></div>
      <div class="kpi"><div class="label">صافي الربح</div><div class="value ${summary.totalProfit>=0?'green':'red'}">${fmt(summary.totalProfit)} ج</div></div>
      <div class="kpi"><div class="label">هامش الربح</div><div class="value blue">${summary.avgMargin?.toFixed(1) ?? 0}%</div></div>
      <div class="kpi"><div class="label">أجهزة مباعة</div><div class="value">${fmt(summary.totalSoldDevices)}</div></div>
      <div class="kpi"><div class="label">في المخزون</div><div class="value blue">${fmt(summary.stockDevices)}</div></div>
      <div class="kpi"><div class="label">قيمة المخزون (تكلفة)</div><div class="value amber">${fmt(totalStockCost)} ج</div></div>
      <div class="kpi"><div class="label">قيمة المخزون (بيع)</div><div class="value green">${fmt(totalStockSelling)} ج</div></div>
    </div>

    <div class="section">
      <div class="section-title">📱 مبيعات الأجهزة حسب الموديل</div>
      <table>
        <thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>وحدات</th><th>إجمالي التكلفة</th><th>إجمالي الإيرادات</th><th>الربح</th><th>الهامش %</th></tr></thead>
        <tbody>
          ${(sales as {brand_name:string;model_name:string;total_units:number;total_cost:number;total_revenue:number;profit:number;margin_pct:number}[])
            .map((r,i) => `<tr>
              <td>${i+1}</td><td>${r.brand_name}</td><td>${r.model_name}</td>
              <td style="text-align:center">${r.total_units}</td>
              <td>${fmt(r.total_cost)} ج</td>
              <td>${fmt(r.total_revenue)} ج</td>
              <td class="${r.profit>=0?'profit-pos':'profit-neg'}">${fmt(r.profit)} ج</td>
              <td style="text-align:center">${r.margin_pct}%</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td colspan="3">الإجمالي</td>
            <td style="text-align:center">${(sales as {total_units:number}[]).reduce((s,r)=>s+r.total_units,0)}</td>
            <td>${fmt((sales as {total_cost:number}[]).reduce((s,r)=>s+r.total_cost,0))} ج</td>
            <td>${fmt((sales as {total_revenue:number}[]).reduce((s,r)=>s+r.total_revenue,0))} ج</td>
            <td class="profit-pos">${fmt((sales as {profit:number}[]).reduce((s,r)=>s+r.profit,0))} ج</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">🏭 الموردون</div>
      <table>
        <thead><tr><th>#</th><th>المورد</th><th>عدد الأجهزة</th><th>إجمالي التكلفة</th><th>النسبة</th></tr></thead>
        <tbody>
          ${(suppliers as {supplier_name:string;total_devices:number;total_cost:number}[]).map((r,i)=>`
            <tr><td>${i+1}</td><td>${r.supplier_name}</td>
            <td style="text-align:center">${r.total_devices}</td>
            <td>${fmt(r.total_cost)} ج</td>
            <td style="text-align:center">${((r.total_cost/(suppliers as {total_cost:number}[]).reduce((s,x)=>s+x.total_cost,1))*100).toFixed(1)}%</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `
  openPrint(body, 'تقرير نظرة عامة — ملخص شامل')
}

function printSales(sales: unknown[]) {
  const rows = sales as {brand_name:string;model_name:string;total_units:number;total_cost:number;total_revenue:number;profit:number;margin_pct:number}[]
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">موديلات مباعة</div><div class="value">${rows.length}</div></div>
      <div class="kpi"><div class="label">إجمالي الوحدات</div><div class="value blue">${fmt(rows.reduce((s,r)=>s+r.total_units,0))}</div></div>
      <div class="kpi"><div class="label">إجمالي الإيرادات</div><div class="value green">${fmt(rows.reduce((s,r)=>s+r.total_revenue,0))} ج</div></div>
      <div class="kpi"><div class="label">صافي الربح</div><div class="value green">${fmt(rows.reduce((s,r)=>s+r.profit,0))} ج</div></div>
    </div>
    <div class="section">
      <div class="section-title">📱 تفاصيل مبيعات الأجهزة</div>
      <table>
        <thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>وحدات مباعة</th><th>إجمالي التكلفة</th><th>إجمالي الإيرادات</th><th>صافي الربح</th><th>هامش الربح %</th></tr></thead>
        <tbody>
          ${rows.map((r,i)=>`<tr>
            <td>${i+1}</td><td><strong>${r.brand_name}</strong></td><td>${r.model_name}</td>
            <td style="text-align:center;font-weight:700">${r.total_units}</td>
            <td>${fmt(r.total_cost)} ج</td>
            <td>${fmt(r.total_revenue)} ج</td>
            <td class="${r.profit>=0?'profit-pos':'profit-neg'}">${fmt(r.profit)} ج</td>
            <td style="text-align:center"><span class="badge ${r.margin_pct>=20?'badge-green':r.margin_pct>=10?'badge-amber':'badge-red'}">${r.margin_pct}%</span></td>
          </tr>`).join('')}
          <tr class="total-row">
            <td colspan="3"><strong>الإجمالي</strong></td>
            <td style="text-align:center"><strong>${rows.reduce((s,r)=>s+r.total_units,0)}</strong></td>
            <td><strong>${fmt(rows.reduce((s,r)=>s+r.total_cost,0))} ج</strong></td>
            <td><strong>${fmt(rows.reduce((s,r)=>s+r.total_revenue,0))} ج</strong></td>
            <td class="profit-pos"><strong>${fmt(rows.reduce((s,r)=>s+r.profit,0))} ج</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
  openPrint(body, 'تقرير مبيعات الأجهزة')
}

function printStock(stock: unknown[]) {
  const rows = stock as {brand_name:string;model_name:string;count:number;total_cost:number;total_selling:number}[]
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">موديلات في المخزون</div><div class="value">${rows.length}</div></div>
      <div class="kpi"><div class="label">إجمالي الوحدات</div><div class="value blue">${fmt(rows.reduce((s,r)=>s+r.count,0))}</div></div>
      <div class="kpi"><div class="label">قيمة التكلفة</div><div class="value amber">${fmt(rows.reduce((s,r)=>s+r.total_cost,0))} ج</div></div>
      <div class="kpi"><div class="label">قيمة البيع المتوقعة</div><div class="value green">${fmt(rows.reduce((s,r)=>s+r.total_selling,0))} ج</div></div>
    </div>
    <div class="section">
      <div class="section-title">📦 تفاصيل مخزون الأجهزة</div>
      <table>
        <thead><tr><th>#</th><th>الماركة</th><th>الموديل</th><th>الكمية</th><th>إجمالي التكلفة</th><th>إجمالي البيع المتوقع</th><th>الربح المتوقع</th></tr></thead>
        <tbody>
          ${rows.map((r,i)=>`<tr>
            <td>${i+1}</td><td><strong>${r.brand_name}</strong></td><td>${r.model_name}</td>
            <td style="text-align:center;font-weight:700">${r.count}</td>
            <td>${fmt(r.total_cost)} ج</td>
            <td>${fmt(r.total_selling)} ج</td>
            <td class="profit-pos">${fmt(r.total_selling-r.total_cost)} ج</td>
          </tr>`).join('')}
          <tr class="total-row">
            <td colspan="3"><strong>الإجمالي</strong></td>
            <td style="text-align:center"><strong>${rows.reduce((s,r)=>s+r.count,0)}</strong></td>
            <td><strong>${fmt(rows.reduce((s,r)=>s+r.total_cost,0))} ج</strong></td>
            <td><strong>${fmt(rows.reduce((s,r)=>s+r.total_selling,0))} ج</strong></td>
            <td class="profit-pos"><strong>${fmt(rows.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} ج</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
  openPrint(body, 'تقرير مخزون الأجهزة')
}

async function printSuppliers(suppliers: unknown[], suppliersWithIds: unknown[]) {
  const rows = suppliers as {supplier_name:string;total_devices:number;total_cost:number}[]
  const suppIds = suppliersWithIds as {supplier_id:string;supplier_name:string;total_invoiced:number;total_paid:number;balance:number}[]
  const total = rows.reduce((s,r)=>s+r.total_cost,0)
  const today = new Date().toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})

  // Fetch invoices for each supplier
  const { paymentsService } = await import('@/services/payments.service')
  
  const supplierInvoicesMap = new Map<string, Awaited<ReturnType<typeof paymentsService.getPurchaseInvoicesBySupplier>>>()
  for (const s of suppIds) {
    try {
      const invoices = await paymentsService.getPurchaseInvoicesBySupplier(s.supplier_id)
      supplierInvoicesMap.set(s.supplier_id, invoices)
    } catch { /* skip */ }
  }

  const styles = `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; font-size:12px; color:#1a1a1a; direction:rtl; background:#fff; }
    .supplier-page { padding:20px 28px; max-width:1000px; margin:0 auto; page-break-after:always; }
    .supplier-page:last-child { page-break-after:avoid; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1d4ed8; padding-bottom:12px; margin-bottom:16px; }
    .page-header h1 { font-size:18px; font-weight:800; color:#1d4ed8; }
    .page-header p { color:#6b7280; font-size:11px; margin-top:3px; }
    .page-header-info p { font-size:11px; color:#374151; text-align:left; margin-bottom:2px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
    .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; }
    .kpi .label { font-size:10px; color:#6b7280; margin-bottom:3px; }
    .kpi .value { font-size:17px; font-weight:800; }
    .kpi .value.green { color:#16a34a; } .kpi .value.red { color:#dc2626; } .kpi .value.blue { color:#2563eb; } .kpi .value.amber { color:#d97706; }
    .section-title { font-size:13px; font-weight:700; color:#1d4ed8; border-bottom:1px solid #dbeafe; padding-bottom:5px; margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    th { background:#eff6ff; color:#1d4ed8; font-weight:700; padding:7px 10px; text-align:right; border:1px solid #bfdbfe; white-space:nowrap; }
    td { padding:6px 10px; border:1px solid #e5e7eb; vertical-align:middle; }
    tr:nth-child(even) td { background:#f9fafb; }
    .total-row td { background:#eff6ff!important; font-weight:700; border-top:2px solid #1d4ed8; }
    .badge { display:inline-block; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
    .badge-red { background:#fee2e2; color:#dc2626; }
    .badge-green { background:#dcfce7; color:#16a34a; }
    .badge-blue { background:#dbeafe; color:#2563eb; }
    .credit { color:#2563eb; font-weight:700; }
    .footer { margin-top:16px; border-top:1px solid #e5e7eb; padding-top:8px; display:flex; justify-content:space-between; color:#9ca3af; font-size:10px; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  `

  const suppliersHtml = suppIds.map(s => {
    const invoices = supplierInvoicesMap.get(s.supplier_id) ?? []
    const totalInv   = invoices.reduce((x,i)=>x+i.total_amount,0)
    const totalPaid  = invoices.reduce((x,i)=>x+i.paid_amount,0)
    const totalRem   = invoices.reduce((x,i)=>x+i.remaining,0)
    const balance    = s.balance

    return `
      <div class="supplier-page">
        <div class="page-header">
          <div>
            <h1>🏭 ${s.supplier_name}</h1>
            <p>Mobile Shop Control — كشف حساب مورد</p>
          </div>
          <div class="page-header-info">
            <p><strong>تاريخ التقرير:</strong> ${today}</p>
            <p><strong>عدد الفواتير:</strong> ${invoices.length}</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi"><div class="label">إجمالي الفواتير</div><div class="value red">${fmt(totalInv)} ج</div></div>
          <div class="kpi"><div class="label">إجمالي المدفوع</div><div class="value green">${fmt(totalPaid)} ج</div></div>
          <div class="kpi"><div class="label">${balance < 0 ? 'رصيد دائن' : 'المتبقي'}</div>
            <div class="value ${balance < 0 ? 'blue' : balance > 0 ? 'red' : 'green'}">${fmt(Math.abs(balance))} ج</div></div>
          <div class="kpi"><div class="label">الحالة</div>
            <div class="value ${balance < 0 ? 'blue' : balance > 0 ? 'red' : 'green'}">${balance < 0 ? '★ رصيد دائن' : balance > 0 ? '⚠ مديونية' : '✓ مسدد'}</div></div>
        </div>

        <div class="section-title">📋 الفواتير (${invoices.length})</div>
        ${invoices.length === 0 ? '<p style="color:#9ca3af;font-size:11px;padding:8px 0">لا توجد فواتير مؤكدة</p>' : `
        <table>
          <thead>
            <tr><th>#</th><th>رقم الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>الخصم</th><th>المدفوع</th><th>المتبقي / الرصيد</th></tr>
          </thead>
          <tbody>
            ${invoices.map((inv,i) => `<tr>
              <td>${i+1}</td>
              <td><strong>${inv.invoice_number}</strong></td>
              <td>${new Date(inv.invoice_date).toLocaleDateString('ar-EG')}</td>
              <td>${fmt(inv.total_amount)} ج</td>
              <td>${inv.discount > 0 ? fmt(inv.discount)+' ج' : '—'}</td>
              <td>${fmt(inv.paid_amount)} ج</td>
              <td>${inv.remaining < 0
                ? `<span class="badge badge-blue">رصيد دائن ${fmt(Math.abs(inv.remaining))} ج</span>`
                : inv.remaining > 0
                  ? `<span class="badge badge-red">${fmt(inv.remaining)} ج</span>`
                  : `<span class="badge badge-green">مسدد ✓</span>`
              }</td>
            </tr>`).join('')}
            <tr class="total-row">
              <td colspan="3"><strong>الإجمالي</strong></td>
              <td><strong>${fmt(totalInv)} ج</strong></td>
              <td><strong>${fmt(invoices.reduce((x,i)=>x+i.discount,0))} ج</strong></td>
              <td><strong>${fmt(totalPaid)} ج</strong></td>
              <td><strong class="${balance<0?'credit':''}">${balance<0?'رصيد دائن '+fmt(Math.abs(balance)):fmt(Math.abs(totalRem))} ج</strong></td>
            </tr>
          </tbody>
        </table>`}

        <div class="footer">
          <span>Mobile Shop Control</span>
          <span>كشف حساب — ${s.supplier_name} — ${today}</span>
        </div>
      </div>
    `
  }).join('')

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8"><title>تقرير الموردين</title>
    <style>${styles}</style>
  </head><body>${suppliersHtml}<script>window.onload=()=>window.print()</script></body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

function printCustomers(customers: unknown[]) {
  const rows = customers as {customer_name:string;device_count:number;total_spent:number}[]
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">عدد العملاء</div><div class="value">${rows.length}</div></div>
      <div class="kpi"><div class="label">إجمالي الأجهزة</div><div class="value blue">${fmt(rows.reduce((s,r)=>s+r.device_count,0))}</div></div>
      <div class="kpi"><div class="label">إجمالي المبيعات</div><div class="value green">${fmt(rows.reduce((s,r)=>s+r.total_spent,0))} ج</div></div>
      <div class="kpi"><div class="label">متوسط لكل عميل</div><div class="value amber">${fmt(rows.length?rows.reduce((s,r)=>s+r.total_spent,0)/rows.length:0)} ج</div></div>
    </div>
    <div class="section">
      <div class="section-title">👥 أفضل العملاء</div>
      <table>
        <thead><tr><th>#</th><th>العميل</th><th>أجهزة مشتراة</th><th>إجمالي الإنفاق</th><th>متوسط الجهاز</th><th>النسبة</th></tr></thead>
        <tbody>
          ${rows.map((r,i)=>`<tr>
            <td>${i+1}</td><td><strong>${r.customer_name}</strong></td>
            <td style="text-align:center;font-weight:700">${r.device_count}</td>
            <td>${fmt(r.total_spent)} ج</td>
            <td>${fmt(r.device_count>0?r.total_spent/r.device_count:0)} ج</td>
            <td style="text-align:center"><span class="badge badge-green">${rows.reduce((s,x)=>s+x.total_spent,0)>0?((r.total_spent/rows.reduce((s,x)=>s+x.total_spent,0))*100).toFixed(1):0}%</span></td>
          </tr>`).join('')}
          <tr class="total-row">
            <td colspan="2"><strong>الإجمالي</strong></td>
            <td style="text-align:center"><strong>${rows.reduce((s,r)=>s+r.device_count,0)}</strong></td>
            <td><strong>${fmt(rows.reduce((s,r)=>s+r.total_spent,0))} ج</strong></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
  openPrint(body, 'تقرير العملاء')
}

function printAlerts(alerts: unknown[]) {
  const rows = alerts as {product_name:string;category_name:string;stock_qty:number;reorder_level:number;cost_price:number;selling_price:number;stock_value:number}[]
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">منتجات تحت الحد</div><div class="value red">${rows.length}</div></div>
      <div class="kpi"><div class="label">قيمة المخزون المنخفض</div><div class="value amber">${fmt(rows.reduce((s,r)=>s+r.stock_value,0))} ج</div></div>
      <div class="kpi"><div class="label">نفذ من المخزون</div><div class="value red">${rows.filter(r=>r.stock_qty===0).length}</div></div>
      <div class="kpi"><div class="label">تحت الحد الأدنى</div><div class="value amber">${rows.filter(r=>r.stock_qty>0).length}</div></div>
    </div>
    <div class="section">
      <div class="section-title">⚠️ تنبيهات المخزون — منتجات تحتاج إعادة طلب</div>
      <table>
        <thead><tr><th>#</th><th>المنتج</th><th>الفئة</th><th>الرصيد الحالي</th><th>الحد الأدنى</th><th>العجز</th><th>سعر التكلفة</th><th>قيمة المخزون</th></tr></thead>
        <tbody>
          ${rows.map((r,i)=>`<tr class="alert-row">
            <td>${i+1}</td>
            <td><strong>${r.product_name}</strong></td>
            <td><span class="badge badge-blue">${r.category_name}</span></td>
            <td style="text-align:center"><span class="badge ${r.stock_qty===0?'badge-red':'badge-amber'}">${r.stock_qty}</span></td>
            <td style="text-align:center">${r.reorder_level}</td>
            <td style="text-align:center;color:#dc2626;font-weight:700">-${Math.max(0,r.reorder_level-r.stock_qty)}</td>
            <td>${fmt(r.cost_price)} ج</td>
            <td>${fmt(r.stock_value)} ج</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `
  openPrint(body, 'تقرير تنبيهات المخزون')
}

function printMovement(
  movType: 'products' | 'devices',
  prodMovement: unknown[], devMovement: unknown[],
  from: string, to: string
) {
  const dateRange = `من ${from} إلى ${to}`
  if (movType === 'products') {
    const rows = prodMovement as {name:string;category_name:string;sku:string|null;unit:string;opening_stock:number;purchased:number;sold:number;current_stock:number;cost_price:number;selling_price:number;stock_value:number;needs_reorder:boolean}[]
    const body = `
      <div class="kpi-grid">
        <div class="kpi"><div class="label">عدد المنتجات</div><div class="value">${rows.length}</div></div>
        <div class="kpi"><div class="label">إجمالي المشتريات</div><div class="value blue">${fmt(rows.reduce((s,r)=>s+r.purchased,0))} وحدة</div></div>
        <div class="kpi"><div class="label">إجمالي المبيعات</div><div class="value green">${fmt(rows.reduce((s,r)=>s+r.sold,0))} وحدة</div></div>
        <div class="kpi"><div class="label">قيمة المخزون الحالي</div><div class="value amber">${fmt(rows.reduce((s,r)=>s+r.stock_value,0))} ج</div></div>
      </div>
      <div class="section">
        <div class="section-title">📊 حركة المنتجات — SOH</div>
        <table>
          <thead><tr>
            <th>#</th><th>المنتج</th><th>الفئة</th><th>رصيد أول الفترة</th><th>مشتريات</th><th>مبيعات</th><th>رصيد آخر الفترة</th><th>سعر التكلفة</th><th>قيمة المخزون</th><th>الحالة</th>
          </tr></thead>
          <tbody>
            ${rows.map((r,i)=>`<tr>
              <td>${i+1}</td>
              <td><strong>${r.name}</strong>${r.sku?`<br><small style="color:#9ca3af">${r.sku}</small>`:''}</td>
              <td><span class="badge badge-blue">${r.category_name}</span></td>
              <td style="text-align:center">${r.opening_stock} ${r.unit}</td>
              <td style="text-align:center;color:#2563eb;font-weight:700">+${r.purchased}</td>
              <td style="text-align:center;color:#16a34a;font-weight:700">-${r.sold}</td>
              <td style="text-align:center;font-weight:700">${r.current_stock} ${r.unit}</td>
              <td>${fmt(r.cost_price)} ج</td>
              <td>${fmt(r.stock_value)} ج</td>
              <td><span class="badge ${r.needs_reorder?'badge-red':'badge-green'}">${r.needs_reorder?'يحتاج طلب':'كافٍ'}</span></td>
            </tr>`).join('')}
            <tr class="total-row">
              <td colspan="3"><strong>الإجمالي</strong></td>
              <td style="text-align:center"><strong>${rows.reduce((s,r)=>s+r.opening_stock,0)}</strong></td>
              <td style="text-align:center;color:#2563eb"><strong>+${rows.reduce((s,r)=>s+r.purchased,0)}</strong></td>
              <td style="text-align:center;color:#16a34a"><strong>-${rows.reduce((s,r)=>s+r.sold,0)}</strong></td>
              <td style="text-align:center"><strong>${rows.reduce((s,r)=>s+r.current_stock,0)}</strong></td>
              <td></td>
              <td><strong>${fmt(rows.reduce((s,r)=>s+r.stock_value,0))} ج</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    openPrint(body, 'تقرير حركة المنتجات — SOH', dateRange)
  } else {
    const rows = devMovement as {brand_name:string;model_name:string;total:number;in_stock:number;sold_in_period:number;purchased_in_period:number;total_revenue:number;total_profit:number}[]
    const body = `
      <div class="kpi-grid">
        <div class="kpi"><div class="label">موديلات</div><div class="value">${rows.length}</div></div>
        <div class="kpi"><div class="label">اشتريت في الفترة</div><div class="value blue">${fmt(rows.reduce((s,r)=>s+r.purchased_in_period,0))}</div></div>
        <div class="kpi"><div class="label">بيعت في الفترة</div><div class="value green">${fmt(rows.reduce((s,r)=>s+r.sold_in_period,0))}</div></div>
        <div class="kpi"><div class="label">إجمالي الإيرادات</div><div class="value green">${fmt(rows.reduce((s,r)=>s+r.total_revenue,0))} ج</div></div>
      </div>
      <div class="section">
        <div class="section-title">📱 حركة الأجهزة — SOH</div>
        <table>
          <thead><tr>
            <th>#</th><th>الماركة</th><th>الموديل</th><th>إجمالي</th><th>في المخزون</th><th>اشتريت</th><th>بيعت</th><th>إيرادات</th><th>ربح</th>
          </tr></thead>
          <tbody>
            ${rows.map((r,i)=>`<tr>
              <td>${i+1}</td>
              <td><strong>${r.brand_name}</strong></td><td>${r.model_name}</td>
              <td style="text-align:center">${r.total}</td>
              <td style="text-align:center"><span class="badge badge-blue">${r.in_stock}</span></td>
              <td style="text-align:center;color:#2563eb;font-weight:700">+${r.purchased_in_period}</td>
              <td style="text-align:center;color:#16a34a;font-weight:700">-${r.sold_in_period}</td>
              <td>${fmt(r.total_revenue)} ج</td>
              <td class="${r.total_profit>=0?'profit-pos':'profit-neg'}">${fmt(r.total_profit)} ج</td>
            </tr>`).join('')}
            <tr class="total-row">
              <td colspan="3"><strong>الإجمالي</strong></td>
              <td style="text-align:center"><strong>${rows.reduce((s,r)=>s+r.total,0)}</strong></td>
              <td style="text-align:center"><strong>${rows.reduce((s,r)=>s+r.in_stock,0)}</strong></td>
              <td style="text-align:center;color:#2563eb"><strong>+${rows.reduce((s,r)=>s+r.purchased_in_period,0)}</strong></td>
              <td style="text-align:center;color:#16a34a"><strong>-${rows.reduce((s,r)=>s+r.sold_in_period,0)}</strong></td>
              <td><strong>${fmt(rows.reduce((s,r)=>s+r.total_revenue,0))} ج</strong></td>
              <td class="profit-pos"><strong>${fmt(rows.reduce((s,r)=>s+r.total_profit,0))} ج</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    openPrint(body, 'تقرير حركة الأجهزة — SOH', dateRange)
  }
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal'
}) {
  const C: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  }
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', C[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

// ── Bar Chart (pure CSS) ──────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color = 'blue', height = 140 }: {
  data: ({ [key: string]: unknown })[]
  valueKey: string; labelKey: string
  color?: string; height?: number
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey] ?? 0)), 1)
  return (
    <div style={{ height }} className="flex items-end gap-1 overflow-x-auto px-1">
      {data.map((d, i) => {
        const val = Number(d[valueKey] ?? 0)
        const pct = (val / max) * 100
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[28px]">
            <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
              {fmtK(val)}
            </div>
            <div
              className={`w-full rounded-t-sm transition-all ${
                color === 'green' ? 'bg-green-500' :
                color === 'red'   ? 'bg-red-500'   :
                color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            <div className="text-[9px] text-gray-400 dark:text-gray-600 truncate w-full text-center">
              {String(d[labelKey] ?? '').slice(0, 8)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'sales' | 'stock' | 'suppliers' | 'customers' | 'alerts' | 'movement'

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
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all')
  const [filterFrom, setFilterFrom] = useState<string>('')
  const [filterTo,   setFilterTo]   = useState<string>('')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfLoading,   setPdfLoading]   = useState(false)

  const dateRange = filterFrom && filterTo
    ? `من ${filterFrom} إلى ${filterTo}`
    : filterFrom ? `من ${filterFrom}` : filterTo ? `إلى ${filterTo}` : 'كل البيانات'

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

  function exportMovementCsv() {
    if (movType === 'products') {
      exportToExcel(`تقرير-حركة-المنتجات-${movFrom}-${movTo}`, SOH_PRODUCT_HEADERS, prodMovement, 'حركة المنتجات', `الفترة من ${movFrom} إلى ${movTo}`)
    } else {
      exportToExcel(`تقرير-حركة-الأجهزة-${movFrom}-${movTo}`, SOH_DEVICE_HEADERS, devMovement, 'حركة الأجهزة', `الفترة من ${movFrom} إلى ${movTo}`)
    }
  }

  async function handlePdf(mode: PdfOutput) {
    setShowPdfModal(false)
    setPdfLoading(true)
    try {
      switch (tab) {
        case 'overview':
          exportOverviewPdf({ output: mode, dateRange, sales, stock, summary: summary ?? null })
          break
        case 'sales':
          exportSalesPdf(sales, mode, dateRange)
          break
        case 'stock':
          exportStockPdf(stock, mode)
          break
        case 'suppliers': {
          const ledgerToUse = selectedSupplierId === 'all'
            ? supplierLedger
            : supplierLedger.filter(s => s.supplier_id === selectedSupplierId)
          await exportSuppliersPdf(ledgerToUse, mode, dateRange)
          break
        }
        case 'customers':
          exportCustomersPdf(customers, mode, dateRange)
          break
        case 'alerts':
          exportAlertsPdf(lowStock, mode)
          break
        case 'movement':
          // fallback to print for movement
          printMovement(movType, prodMovement, devMovement, movFrom, movTo)
          break
      }
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = sumLoad || saleLoad || stckLoad || supLoad || actLoad || lowLoad || custLoad

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

          {/* PDF button */}
          <button onClick={() => setShowPdfModal(true)} disabled={pdfLoading}
            className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50">
            {pdfLoading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Download size={14} />}
            PDF
          </button>
        </div>

        {/* PDF Mode Modal */}
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
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {sumLoad ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({length:8}).map((_,i)=><div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}
            </div>
          ) : summary && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="إجمالي الإيرادات"   value={`${fmt(summary.totalRevenue)} ج`}   icon={DollarSign}  color="green"  />
                <KpiCard label="إجمالي التكاليف"    value={`${fmt(summary.totalCostSold)} ج`}      icon={Package}     color="red"    />
                <KpiCard label="صافي الربح"         value={`${fmt(summary.totalProfit)} ج`}    icon={TrendingUp}  color={summary.totalProfit>=0?'green':'red'} />
                <KpiCard label="هامش الربح"         value={`${summary.avgMargin?.toFixed(1)}%`} icon={BarChart2}  color="blue"   />
                <KpiCard label="أجهزة مباعة"        value={fmt(summary.totalSoldDevices)}            icon={Smartphone}  color="teal"   />
                <KpiCard label="في المخزون"         value={fmt(summary.stockDevices)}         icon={Package}     color="blue"   />
                <KpiCard label="قيمة المخزون (تكلفة)" value={`${fmt(stock.reduce((s,r:(typeof stock)[0])=>s+r.total_cost,0))} ج`} icon={DollarSign} color="amber" />
                <KpiCard label="ربح متوقع من المخزون" value={`${fmt(stock.reduce((s,r:(typeof stock)[0])=>s+(r.total_selling-r.total_cost),0))} ج`} icon={TrendingUp} color="green" />
              </div>

              {/* Activity chart */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">نشاط الأجهزة — آخر 30 يوم</h3>
                {actLoad ? <div className="h-36 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/> : (
                  <BarChart data={activity as unknown as ({[key:string]:unknown})[]} valueKey="devices_sold" labelKey="date" color="green" height={140}/>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Sales ───────────────────────────────────────────────────────── */}
      {tab === 'sales' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="موديلات مباعة"     value={sales.length}                                                       icon={Smartphone} color="blue"   />
            <KpiCard label="إجمالي الوحدات"   value={sales.reduce((s,r)=>s+r.total_units,0)}                             icon={Package}    color="teal"   />
            <KpiCard label="إجمالي الإيرادات" value={`${fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} ج`}              icon={DollarSign} color="green"  />
            <KpiCard label="صافي الربح"       value={`${fmt(sales.reduce((s,r)=>s+r.profit,0))} ج`}                     icon={TrendingUp} color="green"  />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">مبيعات الأجهزة حسب الموديل</h3>
              <span className="text-xs text-gray-400">{sales.length} موديل</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','الماركة','الموديل','وحدات','إجمالي التكلفة','إجمالي الإيرادات','صافي الربح','هامش %'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {saleLoad ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : sales.map((r,i)=>(
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.brand_name}</td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.model_name}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.total_units}</td>
                      <td className="px-3 py-2.5 text-red-600 dark:text-red-400">{fmt(r.total_cost)} ج</td>
                      <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-semibold">{fmt(r.total_revenue)} ج</td>
                      <td className={cn('px-3 py-2.5 font-bold', r.profit>=0?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400')}>
                        {fmt(r.profit)} ج
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={r.margin_pct>=20?'success':r.margin_pct>=10?'warning':'danger'}>{r.margin_pct}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {sales.length>0&&<tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                    <td className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={3}>الإجمالي</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{sales.reduce((s,r)=>s+r.total_units,0)}</td>
                    <td className="px-3 py-2.5 font-bold text-red-600">{fmt(sales.reduce((s,r)=>s+r.total_cost,0))} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(sales.reduce((s,r)=>s+r.profit,0))} ج</td>
                    <td/>
                  </tr>
                </tfoot>}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock ───────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="موديلات في المخزون"      value={stock.length}                                                       icon={Package}    color="blue"  />
            <KpiCard label="إجمالي الوحدات"          value={stock.reduce((s,r)=>s+r.count,0)}                                  icon={Smartphone} color="teal"  />
            <KpiCard label="قيمة التكلفة"            value={`${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج`}                icon={DollarSign} color="amber" />
            <KpiCard label="قيمة البيع المتوقعة"     value={`${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} ج`}             icon={TrendingUp} color="green" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">تفاصيل المخزون</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','الماركة','الموديل','الكمية','إجمالي التكلفة','إجمالي البيع المتوقع','الربح المتوقع'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stckLoad ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : stock.map((r,i)=>(
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.brand_name}</td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.model_name}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.count}</td>
                      <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.total_cost)} ج</td>
                      <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-semibold">{fmt(r.total_selling)} ج</td>
                      <td className="px-3 py-2.5 font-bold text-green-600 dark:text-green-400">{fmt(r.total_selling-r.total_cost)} ج</td>
                    </tr>
                  ))}
                </tbody>
                {stock.length>0&&<tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                    <td className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={3}>الإجمالي</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{stock.reduce((s,r)=>s+r.count,0)}</td>
                    <td className="px-3 py-2.5 font-bold text-amber-600">{fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(stock.reduce((s,r)=>s+r.total_selling,0))} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} ج</td>
                  </tr>
                </tfoot>}
              </table>
            </div>
          </div>

          {/* Products stock section */}
          {prodMovement.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <Tag size={14} className="text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">مخزون المنتجات (إكسسوارات وقطع غيار)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#','المنتج','الفئة','وحدة','الرصيد الحالي','سعر الشراء','قيمة المخزون','الحالة'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {prodMovement.map((r,i)=>(
                      <tr key={i} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/30', r.needs_reorder && 'bg-red-50/20 dark:bg-red-900/5')}>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.name}</td>
                        <td className="px-3 py-2.5"><Badge variant="info">{r.category_name}</Badge></td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{r.unit}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.current_stock}</td>
                        <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.cost_price)} ج</td>
                        <td className="px-3 py-2.5 font-semibold text-purple-600 dark:text-purple-400">{fmt(r.stock_value)} ج</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={r.needs_reorder ? 'danger' : 'success'}>
                            {r.needs_reorder ? 'يحتاج طلب' : 'كافٍ'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {prodMovement.length > 0 && (
                    <tfoot>
                      <tr className="bg-purple-50 dark:bg-purple-900/10 border-t-2 border-purple-200 dark:border-purple-800">
                        <td className="px-3 py-2.5 text-xs font-bold text-purple-700 dark:text-purple-400" colSpan={4}>الإجمالي</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{prodMovement.reduce((s,r)=>s+r.current_stock,0)}</td>
                        <td/>
                        <td className="px-3 py-2.5 font-bold text-purple-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</td>
                        <td/>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Combined KPI */}
          {prodMovement.length > 0 && (
            <div className="bg-gradient-to-l from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">إجمالي المخزون (أجهزة + منتجات)</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">أجهزة في المخزون</p>
                  <p className="text-xl font-bold text-blue-600">{stock.reduce((s,r)=>s+r.count,0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">منتجات (وحدات)</p>
                  <p className="text-xl font-bold text-purple-600">{prodMovement.reduce((s,r)=>s+r.current_stock,0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">قيمة الأجهزة</p>
                  <p className="text-xl font-bold text-amber-600">{fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">قيمة المنتجات</p>
                  <p className="text-xl font-bold text-purple-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">إجمالي قيمة المخزون الكلي</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {fmt(stock.reduce((s,r)=>s+r.total_cost,0) + prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Suppliers ───────────────────────────────────────────────────── */}
      {tab === 'suppliers' && (
        <div className="space-y-5">
          {/* Supplier selector */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Truck size={14} className="text-gray-400 flex-shrink-0" />
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="flex-1 h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer">
                <option value="all">كل الموردين</option>
                {supplierLedger.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const ledger = selectedSupplierId === 'all' ? supplierLedger : supplierLedger.filter(s => s.supplier_id === selectedSupplierId)
                  const supps  = selectedSupplierId === 'all' ? suppliers : suppliers.filter((s: {supplier_name:string}) => ledger.some(l => l.supplier_name === s.supplier_name))
                  void printSuppliers(supps, ledger)
                }}
                className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 whitespace-nowrap">
                <Printer size={13} />
                {selectedSupplierId === 'all' ? 'طباعة الكل' : `طباعة ${supplierLedger.find(s=>s.supplier_id===selectedSupplierId)?.supplier_name ?? ''}`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="عدد الموردين"       value={suppliers.length}                                          icon={Truck}      color="blue"  />
            <KpiCard label="إجمالي الأجهزة"     value={suppliers.reduce((s,r)=>s+r.total_devices,0)}            icon={Smartphone} color="teal"  />
            <KpiCard label="إجمالي المشتريات"   value={`${fmt(suppliers.reduce((s,r)=>s+r.total_cost,0))} ج`}  icon={DollarSign} color="red"   />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">إجمالي المشتريات حسب المورد</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','المورد','عدد الأجهزة','إجمالي التكلفة','النسبة','متوسط سعر الجهاز'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {supLoad ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : suppliers.map((r,i)=>{
                    const total = suppliers.reduce((s,x)=>s+x.total_cost,0)
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.supplier_name}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.total_devices}</td>
                        <td className="px-3 py-2.5 font-semibold text-red-600 dark:text-red-400">{fmt(r.total_cost)} ج</td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="info">{total>0?((r.total_cost/total)*100).toFixed(1):0}%</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                          {fmt(r.total_devices>0?r.total_cost/r.total_devices:0)} ج
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Bar chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">مقارنة الموردين</h3>
            <BarChart data={suppliers as unknown as ({[key:string]:unknown})[]} valueKey="total_cost" labelKey="supplier_name" color="red" height={140}/>
          </div>
        </div>
      )}

      {/* ── Customers ───────────────────────────────────────────────────── */}
      {tab === 'customers' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="عدد العملاء"         value={customers.length}                                              icon={Users}      color="blue"  />
            <KpiCard label="إجمالي الأجهزة"      value={customers.reduce((s,r)=>s+r.device_count,0)}                 icon={Smartphone} color="teal"  />
            <KpiCard label="إجمالي المبيعات"     value={`${fmt(customers.reduce((s,r)=>s+r.total_spent,0))} ج`}     icon={DollarSign} color="green" />
            <KpiCard label="متوسط إنفاق العميل"  value={`${fmt(customers.length?customers.reduce((s,r)=>s+r.total_spent,0)/customers.length:0)} ج`} icon={TrendingUp} color="amber" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">أفضل العملاء</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','العميل','أجهزة','إجمالي الإنفاق','متوسط الجهاز','النسبة'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {custLoad ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : customers.map((r,i)=>{
                    const total = customers.reduce((s,x)=>s+x.total_spent,0)
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5">
                          {i===0?<span className="text-amber-500 font-bold">🥇</span>
                          :i===1?<span className="text-gray-400 font-bold">🥈</span>
                          :i===2?<span className="text-amber-700 font-bold">🥉</span>
                          :<span className="text-xs text-gray-400">{i+1}</span>}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.customer_name}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.device_count}</td>
                        <td className="px-3 py-2.5 font-bold text-green-600 dark:text-green-400">{fmt(r.total_spent)} ج</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{fmt(r.device_count>0?r.total_spent/r.device_count:0)} ج</td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="success">{total>0?((r.total_spent/total)*100).toFixed(1):0}%</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="منتجات تحت الحد"    value={lowStock.length}                                                  icon={AlertTriangle} color="red"   />
            <KpiCard label="نفذ من المخزون"     value={lowStock.filter(r=>r.stock_qty===0).length}                      icon={Package}       color="red"   />
            <KpiCard label="تحت الحد الأدنى"   value={lowStock.filter(r=>r.stock_qty>0).length}                        icon={AlertTriangle} color="amber" />
            <KpiCard label="قيمة المخزون المنخفض" value={`${fmt(lowStock.reduce((s,r)=>s+r.stock_value,0))} ج`}       icon={DollarSign}    color="amber" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">منتجات تحتاج إعادة طلب</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','المنتج','الفئة','الرصيد الحالي','الحد الأدنى','العجز','سعر التكلفة','قيمة المخزون'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {lowLoad ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : lowStock.map((r,i)=>(
                    <tr key={i} className="bg-amber-50/30 dark:bg-amber-900/5 hover:bg-amber-50/60 dark:hover:bg-amber-900/10">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.product_name}</td>
                      <td className="px-3 py-2.5"><Badge variant="info">{r.category_name}</Badge></td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={r.stock_qty===0?'danger':'warning'}>{r.stock_qty}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.reorder_level}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-red-600 dark:text-red-400">
                        -{Math.max(0,r.reorder_level-r.stock_qty)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{fmt(r.cost_price)} ج</td>
                      <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.stock_value)} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Movement / SOH ──────────────────────────────────────────────── */}
      {tab === 'movement' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {([['products','منتجات',Tag],['devices','أجهزة',Smartphone]] as const).map(([v,l,Icon])=>(
                <button key={v} onClick={()=>setMovType(v)}
                  className={cn('flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md transition-all',
                    movType===v?'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400')}>
                  <Icon size={12}/>{l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400"/>
              <input type="date" value={movFrom} onChange={e=>setMovFrom(e.target.value)}
                className="h-8 px-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"/>
              <span className="text-gray-400 text-xs">إلى</span>
              <input type="date" value={movTo} onChange={e=>setMovTo(e.target.value)}
                className="h-8 px-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"/>
            </div>
            <button onClick={()=>{void refetchProd();void refetchDev()}}
              className="h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <RefreshCw size={12}/> تحديث
            </button>
            <button onClick={exportMovementCsv}
              className="h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <Download size={12}/> Excel
            </button>
          </div>

          {/* Products SOH */}
          {movType==='products' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">حركة المنتجات — SOH</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>القيمة الإجمالية: <strong className="text-amber-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</strong></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#','المنتج','الفئة','وحدة','رصيد أول الفترة','مشتريات','مبيعات','رصيد حالي','قيمة المخزون','الحالة'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {prodMovLoad ? <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                    : prodMovement.length===0 ? <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد بيانات</td></tr>
                    : prodMovement.map((r,i)=>(
                      <tr key={i} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/30',r.needs_reorder&&'bg-red-50/20 dark:bg-red-900/5')}>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">
                          {r.name}{r.sku&&<span className="text-xs text-gray-400 dark:text-gray-600 mr-1">#{r.sku}</span>}
                        </td>
                        <td className="px-3 py-2.5"><Badge variant="info">{r.category_name}</Badge></td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{r.unit}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.opening_stock}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">+{r.purchased}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-green-600 dark:text-green-400">-{r.sold}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{r.current_stock}</td>
                        <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.stock_value)} ج</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={r.needs_reorder?'danger':'success'}>{r.needs_reorder?'يحتاج طلب':'كافٍ'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {prodMovement.length>0&&<tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                      <td className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={4}>الإجمالي</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{prodMovement.reduce((s,r)=>s+r.opening_stock,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600">+{prodMovement.reduce((s,r)=>s+r.purchased,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-green-600">-{prodMovement.reduce((s,r)=>s+r.sold,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{prodMovement.reduce((s,r)=>s+r.current_stock,0)}</td>
                      <td className="px-3 py-2.5 font-bold text-amber-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</td>
                      <td/>
                    </tr>
                  </tfoot>}
                </table>
              </div>
            </div>
          )}

          {/* Devices SOH */}
          {movType==='devices' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">حركة الأجهزة — SOH</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#','الماركة','الموديل','إجمالي','في المخزون','اشتريت','بيعت','الإيرادات','الربح'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {devMovLoad ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                    : devMovement.length===0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد بيانات</td></tr>
                    : devMovement.map((r,i)=>(
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.brand_name}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.model_name}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.total}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.in_stock}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">+{r.purchased_in_period}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-green-600 dark:text-green-400">-{r.sold_in_period}</td>
                        <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-semibold">{fmt(r.total_revenue)} ج</td>
                        <td className={cn('px-3 py-2.5 font-bold',r.total_profit>=0?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400')}>
                          {fmt(r.total_profit)} ج
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {devMovement.length>0&&<tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                      <td className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={3}>الإجمالي</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{devMovement.reduce((s,r)=>s+r.total,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600">{devMovement.reduce((s,r)=>s+r.in_stock,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600">+{devMovement.reduce((s,r)=>s+r.purchased_in_period,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-green-600">-{devMovement.reduce((s,r)=>s+r.sold_in_period,0)}</td>
                      <td className="px-3 py-2.5 font-bold text-green-600">{fmt(devMovement.reduce((s,r)=>s+r.total_revenue,0))} ج</td>
                      <td className="px-3 py-2.5 font-bold text-green-600">{fmt(devMovement.reduce((s,r)=>s+r.total_profit,0))} ج</td>
                    </tr>
                  </tfoot>}
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
