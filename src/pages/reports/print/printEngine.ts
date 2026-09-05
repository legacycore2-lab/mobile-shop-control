// src/pages/reports/print/printEngine.ts
// HTML print-to-window functions — all exported

import { fmt } from '@/constants/statusMaps'

export function printStyles() {
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

export function printHeader(title: string, subtitle: string, dateRange?: string) {
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

export function openPrint(body: string, title: string, dateRange?: string) {
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

export function printOverview(summary: Record<string, number> | undefined, sales: unknown[], stock: unknown[], suppliers: unknown[]) {
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

export function printSales(sales: unknown[]) {
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

export function printStock(stock: unknown[]) {
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

export async function printSuppliers(suppliers: unknown[], suppliersWithIds: unknown[]) {
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

export function printCustomers(customers: unknown[]) {
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

export function printAlerts(alerts: unknown[]) {
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

export function printMovement(
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
