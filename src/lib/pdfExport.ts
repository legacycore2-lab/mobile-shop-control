// src/lib/pdfExport.ts
// PDF export using jsPDF — generates real downloadable PDFs

import { jsPDF } from 'jspdf'

export type PdfOutput = 'download' | 'preview'

function fmt(n: number | string | null | undefined): string {
  const num = Number(n ?? 0)
  return isNaN(num) ? '0' : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// ── Core PDF builder ──────────────────────────────────────────────────────────

class PdfBuilder {
  private doc: jsPDF
  private y = 20
  private margin = 14
  private pageW: number
  private pageH: number
  private today: string

  constructor() {
    this.doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    this.pageW = this.doc.internal.pageSize.getWidth()
    this.pageH = this.doc.internal.pageSize.getHeight()
    this.today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    this.doc.setFont('helvetica')
  }

  private checkPage(needed = 10) {
    if (this.y + needed > this.pageH - 15) {
      this.doc.addPage()
      this.y = 20
      this.drawPageFooter()
    }
  }

  private drawPageFooter() {
    const pages = (this.doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    this.doc.setFontSize(8)
    this.doc.setTextColor(150)
    this.doc.text('Mobile Shop Control', this.margin, this.pageH - 6)
    this.doc.text(`Page ${pages} | ${this.today}`, this.pageW - this.margin, this.pageH - 6, { align: 'right' })
    this.doc.setTextColor(0)
  }

  header(title: string, subtitle: string, dateRange?: string) {
    // Blue bar
    this.doc.setFillColor(29, 78, 216)
    this.doc.rect(0, 0, this.pageW, 16, 'F')

    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.margin, 10)

    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Mobile Shop Control', this.pageW - this.margin, 7, { align: 'right' })
    this.doc.text(this.today, this.pageW - this.margin, 12, { align: 'right' })

    this.doc.setTextColor(0)
    this.y = 24

    if (subtitle || dateRange) {
      this.doc.setFontSize(9)
      this.doc.setTextColor(100)
      this.doc.text(dateRange ? `${subtitle} | ${dateRange}` : subtitle, this.margin, this.y)
      this.y += 7
      this.doc.setTextColor(0)
    }

    this.drawPageFooter()
    return this
  }

  sectionTitle(title: string) {
    this.checkPage(12)
    this.y += 4
    this.doc.setFillColor(239, 246, 255)
    this.doc.rect(this.margin, this.y - 4, this.pageW - this.margin * 2, 8, 'F')
    this.doc.setDrawColor(191, 219, 254)
    this.doc.rect(this.margin, this.y - 4, this.pageW - this.margin * 2, 8, 'S')
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(29, 78, 216)
    this.doc.text(title, this.margin + 3, this.y + 1)
    this.doc.setTextColor(0)
    this.doc.setFont('helvetica', 'normal')
    this.y += 10
    return this
  }

  kpiRow(items: { label: string; value: string; color?: 'green' | 'red' | 'blue' | 'amber' }[]) {
    this.checkPage(20)
    const colW = (this.pageW - this.margin * 2) / items.length
    items.forEach((item, i) => {
      const x = this.margin + i * colW
      this.doc.setFillColor(248, 250, 252)
      this.doc.setDrawColor(226, 232, 240)
      this.doc.rect(x, this.y, colW - 2, 16, 'FD')

      this.doc.setFontSize(8)
      this.doc.setTextColor(100)
      this.doc.text(item.label, x + 3, this.y + 5)

      const colorMap = { green: [22, 163, 74], red: [220, 38, 38], blue: [37, 99, 235], amber: [217, 119, 6] }
      const [r, g, b] = item.color ? colorMap[item.color] : [26, 26, 26]
      this.doc.setTextColor(r, g, b)
      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(item.value, x + 3, this.y + 12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(0)
    })
    this.y += 20
    return this
  }

  table(headers: string[], rows: (string | number)[][], colWidths?: number[]) {
    const availW = this.pageW - this.margin * 2
    const widths  = colWidths ?? headers.map(() => availW / headers.length)
    const rowH    = 7
    const headerH = 8

    this.checkPage(headerH + rowH)

    // Header
    this.doc.setFillColor(239, 246, 255)
    this.doc.rect(this.margin, this.y, availW, headerH, 'F')
    this.doc.setDrawColor(191, 219, 254)
    this.doc.rect(this.margin, this.y, availW, headerH, 'S')
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8)
    this.doc.setTextColor(29, 78, 216)

    let xPos = this.margin
    headers.forEach((h, i) => {
      this.doc.text(h, xPos + 2, this.y + 5.5)
      xPos += widths[i]
    })
    this.y += headerH
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(0)

    // Rows
    rows.forEach((row, ri) => {
      this.checkPage(rowH + 2)
      if (ri % 2 === 0) {
        this.doc.setFillColor(249, 250, 251)
        this.doc.rect(this.margin, this.y, availW, rowH, 'F')
      }
      this.doc.setDrawColor(229, 231, 235)
      this.doc.rect(this.margin, this.y, availW, rowH, 'S')
      this.doc.setFontSize(8)

      xPos = this.margin
      row.forEach((cell, ci) => {
        const text = String(cell)
        this.doc.text(text, xPos + 2, this.y + 5)
        xPos += widths[ci]
      })
      this.y += rowH
    })
    return this
  }

  totalRow(cells: string[], colWidths?: number[]) {
    const availW = this.pageW - this.margin * 2
    const widths  = colWidths ?? cells.map(() => availW / cells.length)
    const rowH    = 8
    this.checkPage(rowH)
    this.doc.setFillColor(239, 246, 255)
    this.doc.setDrawColor(29, 78, 216)
    this.doc.rect(this.margin, this.y, availW, rowH, 'FD')
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8)
    this.doc.setTextColor(29, 78, 216)
    let xPos = this.margin
    cells.forEach((cell, i) => {
      this.doc.text(cell, xPos + 2, this.y + 5.5)
      xPos += widths[i]
    })
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(0)
    this.y += rowH + 3
    return this
  }

  newPage() {
    this.doc.addPage()
    this.y = 20
    this.drawPageFooter()
    return this
  }

  spacer(mm = 5) { this.y += mm; return this }

  output(mode: PdfOutput, filename: string) {
    // Update all page footers with correct page numbers
    const totalPages = (this.doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p)
      this.doc.setFontSize(8)
      this.doc.setTextColor(150)
      this.doc.text(`صفحة ${p} من ${totalPages}`, this.pageW / 2, this.pageH - 6, { align: 'center' })
    }

    if (mode === 'download') {
      this.doc.save(`${filename}.pdf`)
    } else {
      const blob = this.doc.output('blob')
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }
}

// ── Public export functions ───────────────────────────────────────────────────

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

// ── Overview PDF ──────────────────────────────────────────────────────────────
export function exportOverviewPdf(opts: Pick<PdfReportOptions, 'output' | 'dateRange' | 'sales' | 'stock' | 'summary'>) {
  const { output, dateRange, sales, stock, summary } = opts
  const pdf = new PdfBuilder()
  pdf.header('تقرير نظرة عامة — ملخص شامل', 'Mobile Shop Control', dateRange)

  if (summary) {
    pdf.kpiRow([
      { label: 'اجمالي الايرادات',   value: `${fmt(summary.totalRevenue)} EGP`,   color: 'green' },
      { label: 'اجمالي التكاليف',    value: `${fmt(summary.totalCostSold)} EGP`,  color: 'red'   },
      { label: 'صافي الربح',         value: `${fmt(summary.totalProfit)} EGP`,    color: summary.totalProfit >= 0 ? 'green' : 'red' },
      { label: 'هامش الربح',         value: `${summary.avgMargin?.toFixed(1)}%`,  color: 'blue'  },
      { label: 'اجهزة مباعة',        value: String(summary.totalSoldDevices),                     },
      { label: 'في المخزون',         value: String(summary.stockDevices),          color: 'blue'  },
      { label: 'قيمة المخزون (تكلفة)', value: `${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} EGP`, color: 'amber' },
      { label: 'ربح متوقع من المخزون', value: `${fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} EGP`, color: 'green' },
    ])
  }

  if (sales.length > 0) {
    pdf.sectionTitle('مبيعات الاجهزة حسب الموديل')
    const headers = ['#', 'الماركة', 'الموديل', 'وحدات', 'التكلفة', 'الايرادات', 'الربح', 'الهامش %']
    const widths  = [8, 35, 40, 15, 35, 35, 35, 20]
    const rows    = sales.map((r, i) => [i+1, r.brand_name, r.model_name, r.total_units, `${fmt(r.total_cost)} EGP`, `${fmt(r.total_revenue)} EGP`, `${fmt(r.profit)} EGP`, `${r.margin_pct}%`])
    pdf.table(headers, rows, widths)
    pdf.totalRow(['الاجمالي', '', '', String(sales.reduce((s,r)=>s+r.total_units,0)), `${fmt(sales.reduce((s,r)=>s+r.total_cost,0))} EGP`, `${fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} EGP`, `${fmt(sales.reduce((s,r)=>s+r.profit,0))} EGP`, ''], widths)
  }

  if (stock.length > 0) {
    pdf.sectionTitle('المخزون الحالي')
    const headers = ['#', 'الماركة', 'الموديل', 'الكمية', 'قيمة التكلفة', 'قيمة البيع', 'الربح المتوقع']
    const widths  = [8, 40, 45, 15, 45, 45, 45]
    const rows    = stock.map((r, i) => [i+1, r.brand_name, r.model_name, r.count, `${fmt(r.total_cost)} EGP`, `${fmt(r.total_selling)} EGP`, `${fmt(r.total_selling - r.total_cost)} EGP`])
    pdf.table(headers, rows, widths)
    pdf.totalRow(['الاجمالي', '', '', String(stock.reduce((s,r)=>s+r.count,0)), `${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} EGP`, `${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} EGP`, `${fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} EGP`], widths)
  }

  pdf.output(output, `تقرير-نظرة-عامة-${new Date().toISOString().split('T')[0]}`)
}

// ── Sales PDF ─────────────────────────────────────────────────────────────────
export function exportSalesPdf(sales: SalesRow[], output: PdfOutput, dateRange: string) {
  const pdf = new PdfBuilder()
  pdf.header('تقرير مبيعات الاجهزة', 'تفاصيل المبيعات والارباح', dateRange)
  pdf.kpiRow([
    { label: 'موديلات مباعة',    value: String(sales.length) },
    { label: 'اجمالي الوحدات',  value: String(sales.reduce((s,r)=>s+r.total_units,0)), color: 'blue' },
    { label: 'اجمالي الايرادات',value: `${fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} EGP`, color: 'green' },
    { label: 'صافي الربح',      value: `${fmt(sales.reduce((s,r)=>s+r.profit,0))} EGP`, color: 'green' },
  ])
  const headers = ['#', 'الماركة', 'الموديل', 'وحدات مباعة', 'اجمالي التكلفة', 'اجمالي الايرادات', 'صافي الربح', 'هامش الربح %']
  const widths  = [8, 35, 40, 20, 40, 40, 35, 25]
  const rows    = sales.map((r, i) => [i+1, r.brand_name, r.model_name, r.total_units, `${fmt(r.total_cost)} EGP`, `${fmt(r.total_revenue)} EGP`, `${fmt(r.profit)} EGP`, `${r.margin_pct}%`])
  pdf.sectionTitle('تفاصيل المبيعات').table(headers, rows, widths)
  pdf.totalRow(['الاجمالي', '', '', String(sales.reduce((s,r)=>s+r.total_units,0)), `${fmt(sales.reduce((s,r)=>s+r.total_cost,0))} EGP`, `${fmt(sales.reduce((s,r)=>s+r.total_revenue,0))} EGP`, `${fmt(sales.reduce((s,r)=>s+r.profit,0))} EGP`, ''], widths)
  pdf.output(output, `تقرير-مبيعات-${new Date().toISOString().split('T')[0]}`)
}

// ── Stock PDF ─────────────────────────────────────────────────────────────────
export function exportStockPdf(stock: StockRow[], output: PdfOutput) {
  const pdf = new PdfBuilder()
  pdf.header('تقرير مخزون الاجهزة', 'الاجهزة المتاحة وقيمتها')
  pdf.kpiRow([
    { label: 'موديلات في المخزون',     value: String(stock.length) },
    { label: 'اجمالي الوحدات',         value: String(stock.reduce((s,r)=>s+r.count,0)), color: 'blue' },
    { label: 'قيمة التكلفة',           value: `${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} EGP`, color: 'amber' },
    { label: 'قيمة البيع المتوقعة',    value: `${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} EGP`, color: 'green' },
  ])
  const headers = ['#', 'الماركة', 'الموديل', 'الكمية', 'اجمالي التكلفة', 'اجمالي البيع المتوقع', 'الربح المتوقع']
  const widths  = [8, 40, 45, 15, 50, 55, 50]
  const rows    = stock.map((r, i) => [i+1, r.brand_name, r.model_name, r.count, `${fmt(r.total_cost)} EGP`, `${fmt(r.total_selling)} EGP`, `${fmt(r.total_selling - r.total_cost)} EGP`])
  pdf.sectionTitle('تفاصيل المخزون').table(headers, rows, widths)
  pdf.totalRow(['الاجمالي', '', '', String(stock.reduce((s,r)=>s+r.count,0)), `${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} EGP`, `${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} EGP`, `${fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} EGP`], widths)
  pdf.output(output, `تقرير-مخزون-${new Date().toISOString().split('T')[0]}`)
}

// ── Suppliers PDF ─────────────────────────────────────────────────────────────
export async function exportSuppliersPdf(
  suppliersLedger: SupplierLedgerRow[],
  output: PdfOutput,
  dateRange: string
) {
  const { paymentsService } = await import('@/services/payments.service')

  const pdf = new PdfBuilder()
  pdf.header('تقرير الموردين', 'كشف حساب تفصيلي لكل مورد', dateRange)

  for (let si = 0; si < suppliersLedger.length; si++) {
    const s = suppliersLedger[si]
    if (si > 0) pdf.newPage()

    // Supplier header
    pdf.sectionTitle(`المورد: ${s.supplier_name}`)
    pdf.kpiRow([
      { label: 'اجمالي الفواتير', value: `${fmt(s.total_invoiced)} EGP`, color: 'red'   },
      { label: 'اجمالي المدفوع',  value: `${fmt(s.total_paid)} EGP`,    color: 'green' },
      { label: s.balance < 0 ? 'رصيد دائن' : 'المتبقي',
        value: `${fmt(Math.abs(s.balance))} EGP`,
        color: s.balance < 0 ? 'blue' : s.balance > 0 ? 'red' : 'green' },
      { label: 'الحالة',
        value: s.balance < 0 ? 'رصيد دائن' : s.balance > 0 ? 'مديونية' : 'مسدد',
        color: s.balance < 0 ? 'blue' : s.balance > 0 ? 'red' : 'green' },
    ])

    // Fetch invoices
    let invoices: InvoiceRow[] = []
    try {
      invoices = await paymentsService.getPurchaseInvoicesBySupplier(s.supplier_id) as InvoiceRow[]
    } catch { /* skip */ }

    if (invoices.length > 0) {
      pdf.sectionTitle(`الفواتير (${invoices.length})`)
      const headers = ['#', 'رقم الفاتورة', 'التاريخ', 'الاجمالي', 'الخصم', 'المدفوع', 'المتبقي / الرصيد']
      const widths  = [8, 40, 30, 40, 25, 40, 60]
      const rows    = invoices.map((inv, i) => [
        i+1,
        inv.invoice_number,
        new Date(inv.invoice_date).toLocaleDateString('en-US'),
        `${fmt(inv.total_amount)} EGP`,
        inv.discount > 0 ? `${fmt(inv.discount)} EGP` : '--',
        `${fmt(inv.paid_amount)} EGP`,
        inv.remaining < 0 ? `Credit: ${fmt(Math.abs(inv.remaining))} EGP` : inv.remaining > 0 ? `Due: ${fmt(inv.remaining)} EGP` : 'Settled',
      ])
      pdf.table(headers, rows, widths)
      const totRem = invoices.reduce((x,i)=>x+i.remaining, 0)
      pdf.totalRow([
        'الاجمالي', '', '',
        `${fmt(invoices.reduce((x,i)=>x+i.total_amount,0))} EGP`,
        `${fmt(invoices.reduce((x,i)=>x+i.discount,0))} EGP`,
        `${fmt(invoices.reduce((x,i)=>x+i.paid_amount,0))} EGP`,
        totRem < 0 ? `Credit: ${fmt(Math.abs(totRem))} EGP` : `Due: ${fmt(Math.abs(totRem))} EGP`,
      ], widths)
    } else {
      pdf.spacer(4)
    }
  }

  pdf.output(output, `تقرير-الموردين-${new Date().toISOString().split('T')[0]}`)
}

// ── Customers PDF ─────────────────────────────────────────────────────────────
export function exportCustomersPdf(customers: CustomerRow[], output: PdfOutput, dateRange: string) {
  const pdf = new PdfBuilder()
  pdf.header('تقرير العملاء', 'افضل العملاء والمبيعات', dateRange)
  const total = customers.reduce((s,r)=>s+r.total_spent,0)
  pdf.kpiRow([
    { label: 'عدد العملاء',        value: String(customers.length) },
    { label: 'اجمالي الاجهزة',    value: String(customers.reduce((s,r)=>s+r.device_count,0)), color: 'blue' },
    { label: 'اجمالي المبيعات',   value: `${fmt(total)} EGP`, color: 'green' },
    { label: 'متوسط لكل عميل',    value: `${fmt(customers.length ? total/customers.length : 0)} EGP`, color: 'amber' },
  ])
  const headers = ['#', 'العميل', 'اجهزة مشتراة', 'اجمالي الانفاق', 'متوسط الجهاز', 'النسبة %']
  const widths  = [8, 60, 30, 50, 50, 25]
  const rows    = customers.map((r, i) => [i+1, r.customer_name, r.device_count, `${fmt(r.total_spent)} EGP`, `${fmt(r.device_count > 0 ? r.total_spent/r.device_count : 0)} EGP`, `${total > 0 ? ((r.total_spent/total)*100).toFixed(1) : 0}%`])
  pdf.sectionTitle('افضل العملاء').table(headers, rows, widths)
  pdf.totalRow(['الاجمالي', '', String(customers.reduce((s,r)=>s+r.device_count,0)), `${fmt(total)} EGP`, '', ''], widths)
  pdf.output(output, `تقرير-عملاء-${new Date().toISOString().split('T')[0]}`)
}

// ── Alerts PDF ────────────────────────────────────────────────────────────────
export function exportAlertsPdf(alerts: AlertRow[], output: PdfOutput) {
  const pdf = new PdfBuilder()
  pdf.header('تقرير تنبيهات المخزون', 'منتجات تحتاج اعادة طلب')
  pdf.kpiRow([
    { label: 'منتجات تحت الحد',     value: String(alerts.length), color: 'red'   },
    { label: 'نفذ من المخزون',      value: String(alerts.filter(r=>r.stock_qty===0).length), color: 'red' },
    { label: 'تحت الحد الادنى',    value: String(alerts.filter(r=>r.stock_qty>0).length), color: 'amber' },
    { label: 'قيمة المخزون المنخفض', value: `${fmt(alerts.reduce((s,r)=>s+r.stock_value,0))} EGP`, color: 'amber' },
  ])
  const headers = ['#', 'المنتج', 'الفئة', 'الرصيد الحالي', 'الحد الادنى', 'العجز', 'سعر التكلفة', 'قيمة المخزون']
  const widths  = [8, 55, 35, 25, 25, 20, 35, 40]
  const rows    = alerts.map((r, i) => [i+1, r.product_name, r.category_name, r.stock_qty, r.reorder_level, `-${Math.max(0, r.reorder_level - r.stock_qty)}`, `${fmt(r.cost_price)} EGP`, `${fmt(r.stock_value)} EGP`])
  pdf.sectionTitle('قائمة المنتجات التي تحتاج اعادة طلب').table(headers, rows, widths)
  pdf.output(output, `تقرير-تنبيهات-${new Date().toISOString().split('T')[0]}`)
}
