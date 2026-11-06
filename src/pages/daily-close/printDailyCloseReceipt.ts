// src/pages/daily-close/printDailyCloseReceipt.ts
// ── طباعة إقفال اليوم — إيصال حراري 80mm (ملخص مضغوط) ──────────────────────────
import { fmt } from '@/lib/fmt'
import { formatDateKeyAr } from '@/lib/dateKey'
import { CASH_METHOD_LABELS } from '@/constants/paymentMethods'
import type { DailyClose } from '@/types/dailyClose'
import { esc } from './printDailyClose'

const egp = (v: number): string => `${fmt(v)} ج`

function kv(label: string, value: string, cls = ''): string {
  return `<div class="kv ${cls}"><span>${label}</span><span>${value}</span></div>`
}

function sec(title: string, inner: string): string {
  return `<div class="sec"><div class="sec-t">${title}</div>${inner}</div>`
}

function build(d: DailyClose, logoUrl: string, now: string): string {
  const cash = sec('حركة النقدية',
    d.cash.byMethod.map(r => kv(CASH_METHOD_LABELS[r.method], egp(r.net))).join('') +
    '<hr class="dashed">' +
    kv('إجمالي الداخل', egp(d.cash.totalIn)) +
    kv('إجمالي الخارج', egp(d.cash.totalOut)) +
    kv('صافي النقدية', egp(d.cash.net), 'grand') +
    '<hr class="dashed">' +
    kv('من مبيعات اليوم', egp(d.cash.fromTodaySales)) +
    kv('من فواتير سابقة', egp(d.cash.fromOlderInvoices)) +
    kv('مدفوع للموردين', egp(d.cash.toSuppliers)) +
    kv('مصروفات', egp(d.cash.expenses)))

  const profit = sec('المبيعات والأرباح',
    kv('عدد الفواتير', String(d.sales.invoiceCount)) +
    kv('إجمالي المبيعات', egp(d.sales.revenue)) +
    kv('الخصومات', egp(d.sales.discount)) +
    kv('تكلفة البضاعة', egp(d.sales.costOfGoods)) +
    kv(`مجمل الربح (${d.sales.marginPct}%)`, egp(d.sales.grossProfit)) +
    kv('المصروفات', egp(d.expenses.total)) +
    kv('صافي الربح', egp(d.netProfit), 'grand'))

  const soldItems = d.sales.items.length === 0 ? '' : sec('ما تم بيعه',
    d.sales.items.map(i => `
      <div class="inv">
        <div class="kv"><span>${esc(i.name)}</span><span>${egp(i.amount)}</span></div>
        <div class="kv small"><span>${i.kind === 'device' ? 'جهاز' : 'إكسسوار'} × ${fmt(i.quantity)}</span><span></span></div>
      </div>`).join(''))

  const invoices = d.sales.invoices.length === 0 ? '' : sec('فواتير البيع',
    d.sales.invoices.map(i => `
      <div class="inv">
        <div class="kv"><span>${esc(i.number)} · ${esc(i.customerName ?? 'نقدي')}</span><span>${egp(i.total)}</span></div>
        ${i.items.map(it => `<div class="kv small"><span>• ${esc(it)}</span><span></span></div>`).join('')}
        ${i.remaining > 0 ? `<div class="kv small"><span>المتبقي</span><span>${egp(i.remaining)}</span></div>` : ''}
      </div>`).join('') +
    `<hr class="dashed">` +
    kv('أجهزة', `${fmt(d.sales.devices.quantity)} (${egp(d.sales.devices.amount)})`) +
    kv('إكسسوارات', `${fmt(d.sales.products.quantity)} (${egp(d.sales.products.amount)})`))

  const purchases = sec('المشتريات',
    d.purchases.invoices.map(i => `
      <div class="inv">
        <div class="kv"><span>${esc(i.number)} · ${esc(i.supplierName)}</span><span>${egp(i.total)}</span></div>
        ${i.items.map(it => `<div class="kv small"><span>• ${esc(it)}</span><span></span></div>`).join('')}
        <div class="kv small"><span>المدفوع</span><span>${egp(i.paid)}</span></div>
      </div>`).join('') +
    (d.purchases.invoices.length > 0 ? '<hr class="dashed">' : '') +
    kv('عدد الفواتير', String(d.purchases.invoiceCount)) +
    kv('الإجمالي', egp(d.purchases.total)) +
    kv('المدفوع', egp(d.purchases.paid)))

  const expenses = d.expenses.byCategory.length === 0 ? '' : sec('المصروفات حسب البند',
    d.expenses.byCategory.map(c => kv(esc(c.name), egp(c.amount))).join(''))

  const receivables = sec('المتبقي عند العملاء',
    kv('الإجمالي', `${egp(d.receivables.totalOutstanding)} (${d.receivables.debtorCount})`) +
    kv('آجل جديد اليوم', egp(d.receivables.newToday)) +
    (d.receivables.topDebtors.length === 0 ? '' : '<hr class="dashed">' +
      d.receivables.topDebtors.map(r => kv(esc(r.name), egp(r.balance))).join('')))

  const payables = sec('المستحق للموردين',
    kv('الإجمالي', `${egp(d.payables.totalOutstanding)} (${d.payables.creditorCount})`) +
    (d.payables.topCreditors.length === 0 ? '' : '<hr class="dashed">' +
      d.payables.topCreditors.map(c => kv(esc(c.name), egp(c.balance))).join('')))

  return `
<div class="receipt">
  <div class="center"><img class="logo" src="${esc(logoUrl)}" alt="ELSHAFEI"></div>
  <hr class="solid">
  <div class="center">
    <div class="r-title">إقفال اليوم</div>
    <div class="r-num">${esc(formatDateKeyAr(d.date))}</div>
  </div>
  <hr class="dashed">
  ${kv('صافي النقدية', egp(d.cash.net), 'big')}
  ${kv('إجمالي المبيعات', egp(d.sales.revenue), 'big')}
  ${kv('صافي الربح', egp(d.netProfit), 'big')}
  ${kv('المتبقي عند العملاء', egp(d.receivables.totalOutstanding), 'big')}
  ${cash}
  ${profit}
  ${soldItems}
  ${invoices}
  ${purchases}
  ${expenses}
  ${receivables}
  ${payables}
  <div class="sigs">
    <div><div class="sig-line"></div>المحاسب</div>
    <div><div class="sig-line"></div>المدير</div>
  </div>
  <hr class="dashed">
  <div class="center small">طُبعت: ${now}</div>
</div>`
}

const CSS = `
  @page { size: 80mm 200mm; margin: 0; }
  html { direction: ltr; }
  html, body { width: 100%; height: auto; overflow-x: hidden; }
  body { color: #000; font-size: 14px; font-weight: 700; }
  * { color: #000 !important; font-weight: 700; text-rendering: geometricPrecision; }
  .receipt { direction: rtl; width: 100%; max-width: 72mm; margin: 0 auto; padding: 2mm 2mm 3mm; }
  .center { text-align: center; }
  .logo { width: 38mm; height: auto; display: inline-block; image-rendering: pixelated; }
  .solid { border: none; border-top: 2px solid #000; margin: 4px 0; }
  .dashed { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  .r-title { font-size: 20px; font-weight: 800; }
  .r-num { font-size: 14px; font-weight: 800; margin-top: 2px; }
  .kv { display: flex; justify-content: space-between; gap: 6px; padding: 1px 0; font-size: 14px; }
  .kv.big { font-size: 16px; font-weight: 800; }
  .kv.grand { font-size: 17px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 3px 0; margin: 3px 0; }
  .kv.small { font-size: 12px; }
  .sec { margin-top: 6px; break-inside: avoid; }
  .sec-t { text-align: center; font-size: 15px; font-weight: 800; border: 2px solid #000; border-radius: 4px; padding: 2px; margin-bottom: 3px; }
  .inv { break-inside: avoid; padding: 1px 0; border-bottom: 1px dotted #000; }
  .small { font-size: 12px; }
  .sigs { margin-top: 4mm; display: flex; justify-content: space-between; gap: 6mm; text-align: center; font-size: 13px; break-inside: avoid; }
  .sigs > div { flex: 1; }
  .sig-line { border-bottom: 1px solid #000; height: 8mm; margin-bottom: 3px; }
`

export async function printDailyCloseReceipt(d: DailyClose): Promise<void> {
  const now = new Date().toLocaleString('en-GB', { hour12: false })
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}brand/elshafei-header-thermal.png?v=20261105`

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إقفال اليوم ${esc(d.date)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; font-family: 'Cairo', Tahoma, Arial, sans-serif; direction: rtl; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
    ${CSS}
    .close-btn { position: fixed; top: 8px; left: 8px; z-index: 9999; width: 32px; height: 32px; border-radius: 50%; background: #dc2626; color: #fff !important; border: none; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
${build(d, logoUrl, now)}
<button class="close-btn no-print" onclick="window.close()">✕</button>
<script>
  Promise.all([document.fonts.ready].concat(Array.from(document.images).map(function (img) {
    return img.complete ? Promise.resolve() : new Promise(function (r) { img.onload = img.onerror = r })
  }))).then(function () {
    var rec = document.querySelector('.receipt')
    if (rec) {
      var mm = Math.ceil(rec.getBoundingClientRect().height * 25.4 / 96)
      // لو الإقفال أطول من ورقة واحدة نسيبه يتقسم على ورقتين بدل ما نصغّر الكلام
      if (mm <= 205) {
        var st = document.createElement('style')
        st.textContent = '@page { size: 80mm ' + (mm + 6) + 'mm; margin: 0 }'
        document.head.appendChild(st)
      }
    }
    window.print()
  })
<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
