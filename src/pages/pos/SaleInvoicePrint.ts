// src/pages/pos/SaleInvoicePrint.ts
// ── طباعة فاتورة البيع — A4 رسمية أو إيصال حراري 80mm (مع باركود كل صنف) ─────────
import QRCode from 'qrcode'
import { fmt } from '@/lib/fmt'

interface DeviceLine {
  brand_name:           string
  model_name:           string
  imei1:                string
  actual_selling_price: number
  cost_price:           number
}

interface ProductLine {
  product_name: string
  unit:         string
  quantity:     number
  unit_price:   number
  subtotal:     number
  cost_price:   number
  code:         string | null   // الباركود أو SKU
}

export interface SaleInvoicePrintData {
  invoice_number:  string
  invoice_date:    string
  status:          string
  customer_name:   string | null
  customer_phone:  string | null
  created_by_name: string
  total_amount:    number
  paid_amount:     number
  discount:        number
  remaining:       number
  notes:           string | null
  devices:         DeviceLine[]
  products:        ProductLine[]
}

export type SaleInvoiceFormat = 'a4' | 'receipt'

interface PrintLine {
  title:    string
  code:     string | null
  qr:       string | null   // data URL لـ QR الكود
  qty:      number
  unit:     number
  total:    number
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function statusLabel(s: string): string {
  if (s === 'confirmed') return 'مؤكدة'
  if (s === 'cancelled') return 'ملغية'
  return 'مسودة'
}

async function qrFor(code: string | null): Promise<string | null> {
  if (!code) return null
  return QRCode.toDataURL(code, { width: 160, margin: 1, errorCorrectionLevel: 'M' })
}

async function buildLines(data: SaleInvoicePrintData): Promise<PrintLine[]> {
  const devices = await Promise.all(data.devices.map(async d => ({
    title: `${d.brand_name} ${d.model_name}`.trim(),
    code:  d.imei1,
    qr:    await qrFor(d.imei1),
    qty:   1,
    unit:  d.actual_selling_price,
    total: d.actual_selling_price,
  })))
  const products = await Promise.all(data.products.map(async p => ({
    title: p.product_name,
    code:  p.code,
    qr:    await qrFor(p.code),
    qty:   p.quantity,
    unit:  p.unit_price,
    total: p.subtotal,
  })))
  return [...devices, ...products]
}

function payStatusHtml(data: SaleInvoicePrintData): string {
  if (data.remaining <= 0) return '<div class="pay paid">✓ مسدد بالكامل</div>'
  if (data.paid_amount > 0) return `<div class="pay partial">سداد جزئي — متبقي ${fmt(data.remaining)} ج</div>`
  return `<div class="pay unpaid">غير مسدد — المطلوب ${fmt(data.total_amount)} ج</div>`
}

// ── A4 ────────────────────────────────────────────────────────────────────────

function a4Body(data: SaleInvoicePrintData, lines: PrintLine[], logoUrl: string, invDate: string, now: string): string {
  const gross = data.total_amount + (data.discount ?? 0)
  const rows = lines.map((l, i) => `
    <tr>
      <td class="c muted">${i + 1}</td>
      <td>
        <div class="item">
          ${l.qr ? `<img class="qr" src="${l.qr}" alt="">` : ''}
          <div>
            <div class="item-name">${escapeHtml(l.title)}</div>
            ${l.code ? `<div class="item-code">${escapeHtml(l.code)}</div>` : ''}
          </div>
        </div>
      </td>
      <td class="c">${l.qty}</td>
      <td class="n">${fmt(l.unit)}</td>
      <td class="n strong">${fmt(l.total)}</td>
    </tr>`).join('')

  return `
<div class="page">
  <div class="head">
    <img class="logo" src="${escapeHtml(logoUrl)}" alt="ELSHAFEI Phones & Accessories">
    <div class="title">
      <h1>فاتورة بيع</h1>
      <div class="num">${escapeHtml(data.invoice_number)}</div>
    </div>
  </div>
  <div class="rule"></div>

  <div class="boxes">
    <div class="box">
      <div class="box-title">بيانات الفاتورة</div>
      <div class="kv"><span>التاريخ</span><b>${invDate}</b></div>
      <div class="kv"><span>الكاشير</span><b>${escapeHtml(data.created_by_name)}</b></div>
      <div class="kv"><span>الحالة</span><b>${statusLabel(data.status)}</b></div>
    </div>
    <div class="box">
      <div class="box-title">العميل</div>
      <div class="kv"><span>الاسم</span><b>${escapeHtml(data.customer_name ?? 'نقدي')}</b></div>
      <div class="kv"><span>الهاتف</span><b>${data.customer_phone ? escapeHtml(data.customer_phone) : '—'}</b></div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr><th class="c w-num">م</th><th>البيان</th><th class="c w-qty">الكمية</th><th class="n w-price">سعر الوحدة</th><th class="n w-price">الإجمالي</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="summary">
    <div class="left">
      ${payStatusHtml(data)}
      ${data.notes ? `<div class="notes">ملاحظات: ${escapeHtml(data.notes)}</div>` : ''}
    </div>
    <div class="totals">
      ${data.discount > 0 ? `
      <div class="t-row"><span>الإجمالي قبل الخصم</span><span>${fmt(gross)} ج</span></div>
      <div class="t-row"><span>الخصم</span><span>− ${fmt(data.discount)} ج</span></div>` : ''}
      <div class="t-grand"><span>الإجمالي المستحق</span><span>${fmt(data.total_amount)} ج</span></div>
      <div class="t-row"><span>المدفوع</span><span class="green">${fmt(data.paid_amount)} ج</span></div>
      <div class="t-row"><span>المتبقي</span><b>${fmt(data.remaining)} ج</b></div>
    </div>
  </div>

  <div class="spacer"></div>

  <div class="sigs">
    <div><div class="sig-line"></div>توقيع العميل</div>
    <div><div class="sig-line"></div>توقيع الكاشير</div>
  </div>

  <div class="foot">
    <div><b>شكراً لتعاملكم مع الشافعي ستور</b></div>
    <div>طُبعت: ${now}</div>
  </div>
</div>`
}

const A4_CSS = `
  @page { size: A4; margin: 0; }
  body { color: #1a1a1a; font-size: 13px; }
  .page { width: 210mm; height: 296mm; padding: 12mm 14mm 10mm; display: flex; flex-direction: column; gap: 7mm; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .logo { width: 48mm; height: auto; display: block; }
  .title { text-align: left; }
  .title h1 { font-size: 30px; font-weight: 800; line-height: 1.1; }
  .title .num { margin-top: 4px; font-size: 14px; font-weight: 700; color: #6b5206; }
  .rule { height: 3px; background: linear-gradient(to left, #b8860b, #1a1a1a); }
  .boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .box { border: 1px solid #dad6cc; border-radius: 6px; padding: 10px 14px; }
  .box-title { font-size: 11px; font-weight: 700; color: #6b5206; margin-bottom: 6px; }
  .kv { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
  .kv span { color: #5c5c5c; }
  table.items { width: 100%; border-collapse: collapse; font-size: 13px; }
  .items th { background: #1a1a1a; color: #fff; font-weight: 600; padding: 9px 8px; text-align: right; }
  .items td { padding: 9px 8px; border-bottom: 1px solid #e6e2d8; vertical-align: middle; }
  .c { text-align: center; } .n { text-align: left; } .strong { font-weight: 700; } .muted { color: #5c5c5c; }
  .w-num { width: 12mm; } .w-qty { width: 16mm; } .w-price { width: 28mm; }
  .item { display: flex; align-items: center; gap: 10px; }
  .qr { width: 12mm; height: 12mm; flex: none; image-rendering: pixelated; }
  .item-name { font-weight: 600; }
  .item-code { margin-top: 2px; font-size: 11px; color: #5c5c5c; direction: ltr; text-align: right; font-family: 'Courier New', monospace; }
  .summary { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; }
  .left { flex: 1; }
  .totals { width: 74mm; border: 1px solid #dad6cc; border-radius: 6px; overflow: hidden; }
  .t-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 13px; border-top: 1px solid #eeeae0; }
  .t-row:first-child { border-top: none; }
  .t-row span:first-child { color: #5c5c5c; }
  .t-grand { display: flex; justify-content: space-between; padding: 10px 14px; font-size: 16px; font-weight: 800; background: #1a1a1a; color: #fff; }
  .green { color: #0f7b4b; font-weight: 600; }
  .pay { display: inline-block; border-radius: 6px; padding: 7px 20px; font-size: 16px; font-weight: 800; border: 2px solid; }
  .pay.paid { color: #0f7b4b; border-color: #0f7b4b; }
  .pay.partial { color: #854d0e; border-color: #854d0e; }
  .pay.unpaid { color: #991b1b; border-color: #991b1b; }
  .notes { margin-top: 12px; font-size: 12px; color: #5c5c5c; line-height: 1.8; max-width: 90mm; }
  .spacer { flex: 1; }
  .sigs { display: flex; justify-content: space-between; gap: 22mm; padding: 0 6mm; text-align: center; font-size: 12px; color: #5c5c5c; }
  .sigs > div { flex: 1; }
  .sig-line { border-bottom: 1px solid #1a1a1a; height: 14mm; margin-bottom: 4px; }
  .foot { border-top: 1px solid #dad6cc; padding-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #5c5c5c; }
  .foot b { color: #1a1a1a; }
`

// ── إيصال 80mm ───────────────────────────────────────────────────────────────

function receiptBody(data: SaleInvoicePrintData, lines: PrintLine[], logoUrl: string, invDate: string, now: string): string {
  const gross = data.total_amount + (data.discount ?? 0)
  const rows = lines.map(l => `
    <div class="line">
      <div class="line-main">
        ${l.qr ? `<img class="qr" src="${l.qr}" alt="">` : ''}
        <div>
          <div class="line-name">${escapeHtml(l.title)}</div>
          ${l.code ? `<div class="line-code">${escapeHtml(l.code)}</div>` : ''}
          <div class="line-qty">${l.qty} × ${fmt(l.unit)}</div>
        </div>
      </div>
      <div class="line-total">${fmt(l.total)}</div>
    </div>`).join('')

  return `
<div class="receipt">
  <div class="center"><img class="logo" src="${escapeHtml(logoUrl)}" alt="ELSHAFEI Phones & Accessories"></div>
  <hr class="solid">
  <div class="center">
    <div class="r-title">فاتورة بيع</div>
    <div class="r-num">${escapeHtml(data.invoice_number)}</div>
  </div>
  <div class="meta">
    <div class="kv"><span>التاريخ</span><b>${invDate}</b></div>
    <div class="kv"><span>الكاشير</span><b>${escapeHtml(data.created_by_name)}</b></div>
    <div class="kv"><span>العميل</span><b>${escapeHtml(data.customer_name ?? 'نقدي')}</b></div>
    ${data.customer_phone ? `<div class="kv"><span>الهاتف</span><b>${escapeHtml(data.customer_phone)}</b></div>` : ''}
  </div>
  <hr class="dashed">
  <div class="kv head-row"><span>البيان</span><span>الإجمالي</span></div>
  ${rows}
  <hr class="dashed">
  ${data.discount > 0 ? `
  <div class="kv"><span>الإجمالي قبل الخصم</span><span>${fmt(gross)} ج</span></div>
  <div class="kv"><span>الخصم</span><span>− ${fmt(data.discount)} ج</span></div>` : ''}
  <div class="kv grand"><span>الإجمالي</span><span>${fmt(data.total_amount)} ج</span></div>
  <div class="kv"><span>المدفوع</span><b>${fmt(data.paid_amount)} ج</b></div>
  <div class="kv"><span>المتبقي</span><b>${fmt(data.remaining)} ج</b></div>
  ${payStatusHtml(data)}
  ${data.notes ? `<hr class="dashed"><div class="small">ملاحظات: ${escapeHtml(data.notes)}</div>` : ''}
  <div class="sigs">
    <div><div class="sig-line"></div>توقيع العميل</div>
    <div><div class="sig-line"></div>توقيع الكاشير</div>
  </div>
  <hr class="dashed">
  <div class="center small foot"><b>شكراً لتعاملكم مع الشافعي ستور</b><br>طُبعت: ${now}</div>
</div>`
}

const RECEIPT_CSS = `
  @page { size: 80mm auto; margin: 0; }
  body { color: #000; font-size: 12px; }
  .receipt { width: 80mm; padding: 4mm 4mm 6mm; }
  .center { text-align: center; }
  .logo { width: 40mm; height: auto; display: inline-block; image-rendering: pixelated; }
  .solid { border: none; border-top: 2px solid #000; margin: 6px 0; }
  .dashed { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .r-title { font-size: 17px; font-weight: 800; }
  .r-num { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .meta { margin-top: 6px; }
  .kv { display: flex; justify-content: space-between; gap: 6px; padding: 2px 0; font-size: 12px; }
  .head-row { font-size: 11px; font-weight: 700; }
  .line { display: flex; justify-content: space-between; gap: 6px; align-items: flex-start; padding: 5px 0; }
  .line-main { display: flex; align-items: center; gap: 6px; }
  .qr { width: 11mm; height: 11mm; flex: none; image-rendering: pixelated; }
  .line-name { font-size: 13px; font-weight: 700; }
  .line-code { font-size: 9px; direction: ltr; text-align: right; font-family: 'Courier New', monospace; }
  .line-qty { font-size: 11px; }
  .line-total { font-size: 13px; font-weight: 800; white-space: nowrap; }
  .grand { font-size: 16px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; margin: 4px 0; }
  .pay { margin-top: 8px; text-align: center; font-size: 13px; font-weight: 800; padding: 6px; border: 2px solid #000; border-radius: 5px; }
  .small { font-size: 10px; line-height: 1.8; }
  .sigs { margin-top: 8mm; display: flex; justify-content: space-between; gap: 6mm; text-align: center; font-size: 10px; }
  .sigs > div { flex: 1; }
  .sig-line { border-bottom: 1px solid #000; height: 10mm; margin-bottom: 3px; }
`

// ── الطباعة ──────────────────────────────────────────────────────────────────

export async function printSaleInvoice(data: SaleInvoicePrintData, format: SaleInvoiceFormat): Promise<void> {
  const invDate = new Date(data.invoice_date).toLocaleDateString('en-GB')
  const now     = new Date().toLocaleString('en-GB', { hour12: false })
  const logoFile = format === 'a4' ? 'elshafei-header.png' : 'elshafei-header-thermal.png'
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}brand/${logoFile}`
  const lines   = await buildLines(data)

  const body = format === 'a4'
    ? a4Body(data, lines, logoUrl, invDate, now)
    : receiptBody(data, lines, logoUrl, invDate, now)
  const css = format === 'a4' ? A4_CSS : RECEIPT_CSS

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ${escapeHtml(data.invoice_number)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; font-family: 'Cairo', Tahoma, Arial, sans-serif; direction: rtl; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
    ${css}
    .close-btn { position: fixed; top: 8px; left: 8px; z-index: 9999; width: 32px; height: 32px; border-radius: 50%; background: #dc2626; color: #fff; border: none; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
${body}
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
