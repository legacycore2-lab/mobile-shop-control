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
  const cash = sec('النقدية',
    d.cash.byMethod.map(r => kv(CASH_METHOD_LABELS[r.method], egp(r.net))).join('') +
    '<hr class="dashed">' +
    kv('الداخل', egp(d.cash.totalIn)) +
    kv('الخارج', egp(d.cash.totalOut)) +
    kv('صافي النقدية', egp(d.cash.net), 'grand'))

  const profit = sec('المبيعات والأرباح',
    kv(`المبيعات (${d.sales.invoiceCount} فاتورة)`, egp(d.sales.revenue)) +
    (d.sales.discount > 0 ? kv('الخصومات', egp(d.sales.discount)) : '') +
    kv('تكلفة البضاعة', egp(d.sales.costOfGoods)) +
    kv('المصروفات', egp(d.expenses.total)) +
    kv('صافي الربح', egp(d.netProfit), 'grand'))

  const soldItems = d.sales.items.length === 0 ? '' : sec('ما تم بيعه',
    d.sales.items.map(i => `
      <div class="inv">
        ${kv(`${esc(i.name)} ×${fmt(i.quantity)}`, egp(i.amount))}
        ${kv(`تكلفة ${fmt(i.cost)}`, `ربح ${fmt(i.amount - i.cost)}`, 'small')}
      </div>`).join('') +
    '<hr class="dashed">' +
    kv('إجمالي التكلفة', egp(d.sales.costOfGoods)) +
    kv('إجمالي الربح', egp(d.sales.grossProfit), 'grand'))

  const purchases = d.purchases.invoices.length === 0 ? '' : sec('ما تم شراؤه',
    d.purchases.invoices.map(i => `
      <div class="inv">
        <div class="kv"><span>${esc(i.supplierName)}</span><span>${egp(i.total)}</span></div>
        ${i.items.length > 0 ? `<div class="small">${i.items.map(esc).join('، ')}</div>` : ''}
      </div>`).join(''))

  const expenses = d.expenses.byCategory.length === 0 ? '' : sec('المصروفات',
    d.expenses.byCategory.map(c => kv(esc(c.name), egp(c.amount))).join(''))

  const dues = sec('المديونيات',
    kv('عند العملاء', egp(d.receivables.totalOutstanding)) +
    kv('للموردين', egp(d.payables.totalOutstanding)))

  return `
<div class="receipt">
  <div class="center"><img class="logo" src="${esc(logoUrl)}" alt="ELSHAFEI"></div>
  <hr class="solid">
  <div class="center">
    <div class="r-title">إقفال اليوم</div>
    <div class="r-num">${esc(formatDateKeyAr(d.date))}</div>
  </div>
  <hr class="dashed">
  ${cash}
  ${profit}
  ${soldItems}
  ${purchases}
  ${expenses}
  ${dues}
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
  .solid { border: none; border-top: 2px solid #000; margin: 3px 0; }
  .dashed { border: none; border-top: 1px dashed #000; margin: 2px 0; }
  .r-title { font-size: 20px; font-weight: 800; }
  .r-num { font-size: 14px; font-weight: 800; margin-top: 2px; }
  .kv { display: flex; justify-content: space-between; gap: 6px; padding: 0; font-size: 13px; line-height: 1.35; }
    .kv.grand { font-size: 15px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 1px 0; margin: 2px 0; }
  .kv.small { font-size: 11px; line-height: 1.3; }
  .sec { margin-top: 4px; break-inside: avoid; }
  .sec-t { text-align: center; font-size: 13px; font-weight: 800; border: 1.5px solid #000; border-radius: 3px; padding: 0 2px; margin-bottom: 2px; }
  .inv { break-inside: avoid; padding: 1px 0; border-bottom: 1px dotted #000; }
  .small { font-size: 11px; line-height: 1.3; }
  .sigs { margin-top: 2mm; display: flex; justify-content: space-between; gap: 6mm; text-align: center; font-size: 13px; break-inside: avoid; }
  .sigs > div { flex: 1; }
  .sig-line { border-bottom: 1px solid #000; height: 6mm; margin-bottom: 3px; }
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
