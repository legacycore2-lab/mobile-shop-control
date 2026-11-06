// src/pages/daily-close/printDailyClose.ts
// ── طباعة إقفال اليوم — ورقة A4 بنفس شكل الفواتير (لوجو + عناوين + توقيعات) ─────
import { fmt } from '@/lib/fmt'
import { formatDateKeyAr } from '@/lib/dateKey'
import { CASH_METHOD_LABELS } from '@/constants/paymentMethods'
import type { DailyClose } from '@/types/dailyClose'

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const egp = (v: number): string => `${fmt(v)} ج`

function kv(label: string, value: string, strong = false): string {
  return `<div class="kv"><span>${label}</span>${strong ? `<b>${value}</b>` : `<span class="v">${value}</span>`}</div>`
}

function section(title: string, inner: string): string {
  return `<section class="sec"><div class="sec-title">${title}</div>${inner}</section>`
}

function table(head: string[], rows: string[][], totalRow?: string[]): string {
  const th = head.map((h, i) => `<th class="${i === 0 ? '' : 'n'}">${h}</th>`).join('')
  const body = rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 0 ? '' : 'n'}">${c}</td>`).join('')}</tr>`).join('')
  const tot = totalRow ? `<tr class="tot">${totalRow.map((c, i) => `<td class="${i === 0 ? '' : 'n'}">${c}</td>`).join('')}</tr>` : ''
  return `<table class="grid"><thead><tr>${th}</tr></thead><tbody>${body}${tot}</tbody></table>`
}

function build(d: DailyClose, logoUrl: string, now: string): string {
  const kpis = [
    { label: 'صافي النقدية',        value: egp(d.cash.net),                      cls: d.cash.net >= 0 ? 'pos' : 'neg' },
    { label: 'إجمالي المبيعات',     value: egp(d.sales.revenue),                 cls: '' },
    { label: 'صافي الربح',          value: egp(d.netProfit),                     cls: d.netProfit >= 0 ? 'pos' : 'neg' },
    { label: 'المتبقي عند العملاء', value: egp(d.receivables.totalOutstanding),  cls: '' },
  ].map(k => `<div class="kpi"><div class="kpi-l">${k.label}</div><div class="kpi-v ${k.cls}">${k.value}</div></div>`).join('')

  const cash = section('حركة النقدية',
    table(
      ['الوسيلة', 'داخل', 'خارج', 'الصافي'],
      d.cash.byMethod.map(r => [CASH_METHOD_LABELS[r.method], egp(r.cashIn), egp(r.cashOut), egp(r.net)]),
      ['الإجمالي', egp(d.cash.totalIn), egp(d.cash.totalOut), egp(d.cash.net)],
    ) +
    `<div class="kvs">
      ${kv('محصّل من مبيعات اليوم', egp(d.cash.fromTodaySales))}
      ${kv('محصّل من فواتير سابقة', egp(d.cash.fromOlderInvoices))}
      ${kv('مدفوع للموردين', egp(d.cash.toSuppliers))}
      ${kv('مصروفات', egp(d.cash.expenses))}
    </div>`)

  const profit = section('المبيعات والأرباح',
    `<div class="kvs">
      ${kv('عدد فواتير البيع', String(d.sales.invoiceCount))}
      ${kv('إجمالي المبيعات (بعد الخصم)', egp(d.sales.revenue))}
      ${kv('الخصومات', egp(d.sales.discount))}
      ${kv('تكلفة البضاعة المباعة', egp(d.sales.costOfGoods))}
      ${kv(`مجمل الربح (${d.sales.marginPct}%)`, egp(d.sales.grossProfit))}
      ${kv('المصروفات', egp(d.expenses.total))}
      <div class="kv grand"><span>صافي الربح</span><span>${egp(d.netProfit)}</span></div>
    </div>`)

  const sales = d.sales.invoices.length === 0 ? '' : section('فواتير البيع',
    table(
      ['الفاتورة', 'العميل', 'الأصناف', 'الإجمالي', 'المدفوع', 'المتبقي'],
      d.sales.invoices.map(i => [
        esc(i.number), esc(i.customerName ?? 'نقدي'), i.items.map(esc).join('<br>'),
        egp(i.total), egp(i.paid), i.remaining > 0 ? egp(i.remaining) : '—',
      ]),
    ) +
    `<div class="note">أجهزة: ${fmt(d.sales.devices.quantity)} (${egp(d.sales.devices.amount)}) — إكسسوارات: ${fmt(d.sales.products.quantity)} (${egp(d.sales.products.amount)}) — قبل الخصم</div>`)

  const purchases = section('المشتريات',
    `<div class="kvs">
      ${kv('عدد فواتير الشراء', String(d.purchases.invoiceCount))}
      ${kv('إجمالي المشتريات', egp(d.purchases.total))}
      ${kv('المدفوع منها', egp(d.purchases.paid))}
    </div>` +
    (d.purchases.invoices.length === 0 ? '' : table(
      ['الفاتورة', 'المورد', 'الأصناف', 'الإجمالي', 'المدفوع'],
      d.purchases.invoices.map(i => [esc(i.number), esc(i.supplierName), i.items.map(esc).join('<br>'), egp(i.total), egp(i.paid)]),
    )))

  const expenses = d.expenses.byCategory.length === 0 ? '' : section('المصروفات حسب البند',
    table(['البند', 'المبلغ'], d.expenses.byCategory.map(c => [esc(c.name), egp(c.amount)]), ['الإجمالي', egp(d.expenses.total)]))

  const receivables = section('المتبقي عند العملاء',
    `<div class="kvs">
      ${kv('إجمالي المتبقي', `${egp(d.receivables.totalOutstanding)} (${d.receivables.debtorCount} عميل)`)}
      ${kv('آجل جديد اليوم', egp(d.receivables.newToday))}
    </div>` +
    (d.receivables.topDebtors.length === 0 ? '' : table(
      ['العميل', 'الهاتف', 'المتبقي'],
      d.receivables.topDebtors.map(r => [esc(r.name), esc(r.phone ?? '—'), egp(r.balance)]),
    )))

  const payables = section('المستحق للموردين',
    `<div class="kvs">${kv('إجمالي المستحق', `${egp(d.payables.totalOutstanding)} (${d.payables.creditorCount} مورد)`)}</div>` +
    (d.payables.topCreditors.length === 0 ? '' : table(
      ['المورد', 'الهاتف', 'المستحق'],
      d.payables.topCreditors.map(c => [esc(c.name), esc(c.phone ?? '—'), egp(c.balance)]),
    )))

  return `
<div class="page">
  <div class="head">
    <img class="logo" src="${esc(logoUrl)}" alt="ELSHAFEI">
    <div class="title">
      <h1>إقفال اليوم</h1>
      <div class="num">${esc(formatDateKeyAr(d.date))}</div>
    </div>
  </div>
  <div class="rule"></div>

  <div class="kpis">${kpis}</div>

  <div class="cols">
    <div>${cash}</div>
    <div>${profit}</div>
  </div>

  ${sales}
  ${purchases}
  ${expenses}
  <div class="cols">
    <div>${receivables}</div>
    <div>${payables}</div>
  </div>

  <div class="sigs">
    <div><div class="sig-line"></div>توقيع المحاسب</div>
    <div><div class="sig-line"></div>توقيع المدير</div>
  </div>

  <div class="foot">
    <div><b>الشافعي ستور</b></div>
    <div>طُبعت: ${now}</div>
  </div>
</div>`
}

const CSS = `
  @page { size: A4; margin: 12mm 14mm 10mm; }
  body { color: #1a1a1a; font-size: 12px; }
  .page { display: flex; flex-direction: column; gap: 5mm; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .logo { width: 48mm; height: auto; display: block; }
  .title { text-align: left; }
  .title h1 { font-size: 28px; font-weight: 800; line-height: 1.1; }
  .title .num { margin-top: 4px; font-size: 13px; font-weight: 700; color: #6b5206; }
  .rule { height: 3px; background: linear-gradient(to left, #b8860b, #1a1a1a); }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
  .kpi { border: 1px solid #dad6cc; border-radius: 6px; padding: 8px 10px; }
  .kpi-l { font-size: 11px; color: #6b5206; font-weight: 700; }
  .kpi-v { margin-top: 3px; font-size: 16px; font-weight: 800; }
  .pos { color: #0f7b4b; } .neg { color: #991b1b; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; align-items: start; }
  .sec { break-inside: avoid; }
  .sec-title { font-size: 12px; font-weight: 800; color: #fff; background: #1a1a1a; padding: 5px 10px; border-radius: 4px 4px 0 0; }
  table.grid { width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #dad6cc; }
  .grid th { background: #f1eee5; font-weight: 700; padding: 6px 8px; text-align: right; border-bottom: 1px solid #dad6cc; }
  .grid td { padding: 6px 8px; border-bottom: 1px solid #e6e2d8; vertical-align: top; }
  .grid tr { break-inside: avoid; }
  .grid thead { display: table-header-group; }
  .n { text-align: left; white-space: nowrap; }
  .grid tr.tot td { font-weight: 800; background: #f1eee5; border-top: 2px solid #1a1a1a; }
  .kvs { border: 1px solid #dad6cc; border-top: none; }
  .sec > table.grid + .kvs { margin-top: 3mm; border-top: 1px solid #dad6cc; }
  .sec > .kvs + table.grid { margin-top: 3mm; }
  .kv { display: flex; justify-content: space-between; padding: 5px 10px; font-size: 12px; border-top: 1px solid #eeeae0; }
  .kv:first-child { border-top: none; }
  .kv > span:first-child { color: #5c5c5c; }
  .kv .v, .kv b { font-weight: 700; }
  .kv.grand { background: #1a1a1a; color: #fff; font-size: 14px; font-weight: 800; }
  .kv.grand > span:first-child { color: #fff; }
  .note { margin-top: 3mm; font-size: 11px; color: #5c5c5c; }
  .sigs { display: flex; justify-content: space-between; gap: 22mm; padding: 6mm 6mm 0; text-align: center; font-size: 12px; color: #5c5c5c; break-inside: avoid; }
  .sigs > div { flex: 1; }
  .sig-line { border-bottom: 1px solid #1a1a1a; height: 14mm; margin-bottom: 4px; }
  .foot { border-top: 1px solid #dad6cc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #5c5c5c; break-inside: avoid; }
  .foot b { color: #1a1a1a; }
`

export async function printDailyClose(d: DailyClose): Promise<void> {
  const now = new Date().toLocaleString('en-GB', { hour12: false })
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}brand/elshafei-header.png?v=20261105`

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
    body { padding: 12mm 14mm 10mm; }
    @media print { body { padding: 0; } }
    .close-btn { position: fixed; top: 8px; left: 8px; z-index: 9999; width: 32px; height: 32px; border-radius: 50%; background: #dc2626; color: #fff; border: none; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
${build(d, logoUrl, now)}
<button class="close-btn no-print" onclick="window.close()">✕</button>
<script>
  Promise.all([document.fonts.ready].concat(Array.from(document.images).map(function (img) {
    return img.complete ? Promise.resolve() : new Promise(function (r) { img.onload = img.onerror = r })
  }))).then(function () { window.print() })
<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
