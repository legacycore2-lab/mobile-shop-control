// src/pages/pos/SaleInvoicePrint.ts
// ── Thermal Receipt 80mm — فاتورة البيع ──────────────────────────────────────
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

function statusLabel(s: string) {
  if (s === 'confirmed') return 'مؤكدة'
  if (s === 'cancelled') return 'ملغية'
  return 'مسودة'
}

export function printSaleInvoice(data: SaleInvoicePrintData) {
  const invDate = new Date(data.invoice_date).toLocaleDateString('en-GB')
  const now     = new Date().toLocaleString('en-GB', { hour12: false })
  const grossTotal = data.total_amount + (data.discount ?? 0)

  const deviceRows = data.devices.map((d, i) => `
    <tr>
      <td class="lnum">${i + 1}</td>
      <td class="ldesc">${d.brand_name} ${d.model_name}<br><span class="mono">${d.imei1}</span></td>
      <td class="lqty">1</td>
      <td class="lprice">${fmt(d.actual_selling_price)}</td>
    </tr>
  `).join('')

  const productRows = data.products.map((p, i) => `
    <tr>
      <td class="lnum">${data.devices.length + i + 1}</td>
      <td class="ldesc">${p.product_name}</td>
      <td class="lqty">${p.quantity}</td>
      <td class="lprice">${fmt(p.subtotal)}</td>
    </tr>
  `).join('')

  const payStatus =
    data.remaining <= 0
      ? '<div class="pay-status paid">✓ مسدد بالكامل</div>'
      : data.paid_amount > 0
        ? `<div class="pay-status partial">سداد جزئي — متبقي: ${fmt(data.remaining)} ج</div>`
        : `<div class="pay-status unpaid">غير مسدد — المطلوب: ${fmt(data.total_amount)} ج</div>`

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ${data.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Courier New', monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      direction: rtl;
    }
    .receipt {
      width: 80mm;
      margin: 0 auto;
      padding: 4mm 3mm;
    }

    /* ── Shop Header ── */
    .shop-name {
      text-align: center;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .shop-name span { color: #555; }
    .shop-sub {
      text-align: center;
      font-size: 10px;
      color: #555;
      margin-top: 2px;
    }

    /* ── Divider ── */
    .dashed { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .solid  { border: none; border-top: 2px solid #000; margin: 5px 0; }

    /* ── Invoice Meta ── */
    .meta { font-size: 11px; line-height: 1.8; }
    .meta-row { display: flex; justify-content: space-between; }
    .meta-row .k { color: #555; }
    .meta-row .v { font-weight: 700; }

    /* ── Items Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .lnum   { width: 14px; text-align: center; color: #555; }
    .ldesc  { padding: 3px 4px; }
    .lqty   { width: 22px; text-align: center; }
    .lprice { width: 40px; text-align: left; font-weight: 700; }
    .mono   { font-family: 'Courier New', monospace; font-size: 9px; color: #555; }
    tbody tr { border-bottom: 1px dotted #ccc; }
    tbody tr:last-child { border-bottom: none; }

    /* ── Totals ── */
    .totals { font-size: 12px; margin-top: 3px; }
    .tot-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .tot-row.grand {
      font-size: 15px;
      font-weight: 900;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 4px 0;
      margin: 3px 0;
    }
    .tot-row.paid { color: #166534; }
    .tot-row.due  { color: #991b1b; font-weight: 700; }

    /* ── Payment Status ── */
    .pay-status {
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      padding: 5px;
      margin: 5px 0;
      border-radius: 4px;
    }
    .paid    { background: #dcfce7; color: #166534; }
    .partial { background: #fef9c3; color: #854d0e; }
    .unpaid  { background: #fee2e2; color: #991b1b; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      font-size: 10px;
      color: #555;
      line-height: 1.8;
      margin-top: 5px;
    }

    /* ── Signature ── */
    .sig { margin-top: 8mm; display: flex; justify-content: space-between; }
    .sig-box { text-align: center; font-size: 10px; width: 45%; }
    .sig-line { border-bottom: 1px solid #000; height: 10mm; margin-bottom: 3px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- Shop Header -->
  <div class="shop-name">الشافعي <span>ستور</span></div>
  <div class="shop-sub">متجر الهواتف والإكسسوارات</div>
  <hr class="solid">

  <!-- Invoice Meta -->
  <div class="meta">
    <div class="meta-row"><span class="k">رقم الفاتورة</span><span class="v">${data.invoice_number}</span></div>
    <div class="meta-row"><span class="k">التاريخ</span><span class="v">${invDate}</span></div>
    <div class="meta-row"><span class="k">الحالة</span><span class="v">${statusLabel(data.status)}</span></div>
    <div class="meta-row"><span class="k">الكاشير</span><span class="v">${data.created_by_name}</span></div>
    ${data.customer_name ? `<div class="meta-row"><span class="k">العميل</span><span class="v">${data.customer_name}</span></div>` : ''}
    ${data.customer_phone ? `<div class="meta-row"><span class="k">الهاتف</span><span class="v">${data.customer_phone}</span></div>` : ''}
  </div>
  <hr class="dashed">

  <!-- Items -->
  <table>
    <thead>
      <tr>
        <th class="lnum">#</th>
        <th class="ldesc" style="text-align:right">الصنف</th>
        <th class="lqty">ك</th>
        <th class="lprice">السعر</th>
      </tr>
    </thead>
    <tbody>
      ${deviceRows}
      ${productRows}
    </tbody>
  </table>
  <hr class="dashed">

  <!-- Totals -->
  <div class="totals">
    ${data.discount > 0 ? `
    <div class="tot-row">
      <span>إجمالي الأصناف</span>
      <span>${fmt(grossTotal)} ج</span>
    </div>
    <div class="tot-row" style="color:#c2410c">
      <span>الخصم</span>
      <span>− ${fmt(data.discount)} ج</span>
    </div>` : ''}
    <div class="tot-row grand">
      <span>الإجمالي</span>
      <span>${fmt(data.total_amount)} ج</span>
    </div>
    ${data.paid_amount > 0 ? `
    <div class="tot-row paid">
      <span>المدفوع</span>
      <span>${fmt(data.paid_amount)} ج</span>
    </div>` : ''}
    ${data.remaining > 0 ? `
    <div class="tot-row due">
      <span>المتبقي</span>
      <span>${fmt(data.remaining)} ج</span>
    </div>` : ''}
  </div>

  <!-- Payment Status -->
  ${payStatus}

  ${data.notes ? `<hr class="dashed"><div style="font-size:10px;color:#555">ملاحظات: ${data.notes}</div>` : ''}

  <!-- Signature -->
  <div class="sig">
    <div class="sig-box"><div class="sig-line"></div>توقيع العميل</div>
    <div class="sig-box"><div class="sig-line"></div>توقيع الكاشير</div>
  </div>

  <hr class="dashed">

  <!-- Footer -->
  <div class="footer">
    شكراً لتعاملكم مع الشافعي ستور<br>
    طُبعت: ${now}
  </div>

</div>
<style>
  .close-btn{position:fixed;top:8px;left:8px;z-index:9999;width:32px;height:32px;border-radius:50%;background:#dc2626;color:#fff;border:none;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
  @media print{.close-btn{display:none!important}}
</style>
<button class="close-btn no-print" onclick="window.close()">✕</button>
<script>document.fonts.ready.then(() => window.print())</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
