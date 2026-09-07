// src/pages/pos/SaleInvoicePrint.ts
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
  const today   = new Date().toLocaleDateString('en-US')
  const invDate = new Date(data.invoice_date).toLocaleDateString('en-US')
  const isConf  = data.status === 'confirmed'

  const deviceRows = data.devices.map((d, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><strong>${d.brand_name} ${d.model_name}</strong></td>
      <td class="mono center">${d.imei1}</td>
      <td class="center">1</td>
      <td class="num">${fmt(d.actual_selling_price)} ج</td>
      <td class="num bold green">${fmt(d.actual_selling_price)} ج</td>
    </tr>
  `).join('')

  const productRows = data.products.map((p, i) => `
    <tr>
      <td class="center">${data.devices.length + i + 1}</td>
      <td>${p.product_name}</td>
      <td class="center">—</td>
      <td class="center">${p.quantity} ${p.unit}</td>
      <td class="num">${fmt(p.unit_price)} ج</td>
      <td class="num bold green">${fmt(p.subtotal)} ج</td>
    </tr>
  `).join('')

  const grossTotal = data.total_amount + (data.discount ?? 0)

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة بيع ${data.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      direction: rtl;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm 14mm 10mm;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      margin-bottom: 20px;
      gap: 16px;
    }
    .shop-brand {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .shop-name {
      font-size: 32px;
      font-weight: 900;
      color: #1e40af;
      letter-spacing: -1px;
      line-height: 1;
    }
    .shop-name span {
      color: #f59e0b;
    }
    .shop-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 600;
    }
    .shop-contact {
      font-size: 10.5px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .inv-info {
      text-align: left;
      background: #1e40af;
      color: #fff;
      border-radius: 14px;
      padding: 14px 20px;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }
    .inv-info .inv-label {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.75;
      letter-spacing: 0.5px;
    }
    .inv-info .inv-title {
      font-size: 22px;
      font-weight: 900;
      line-height: 1.1;
    }
    .inv-info .inv-num {
      font-size: 14px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      opacity: 0.9;
    }
    .inv-info .inv-status {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 12px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 800;
      background: ${isConf ? '#bbf7d0' : '#fecaca'};
      color: ${isConf ? '#14532d' : '#7f1d1d'};
      width: fit-content;
    }

    /* ── Divider ── */
    .divider {
      height: 3px;
      background: linear-gradient(90deg, #1e40af, #f59e0b, #1e40af);
      border-radius: 99px;
      margin-bottom: 18px;
    }

    /* ── Info Grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .info-box {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
    }
    .info-box .box-title {
      font-size: 10px;
      font-weight: 800;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 9px;
      padding-bottom: 6px;
      border-bottom: 1.5px solid #dbeafe;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .info-row .lbl { color: #64748b; }
    .info-row .val { font-weight: 700; color: #0f172a; }

    /* ── Table ── */
    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 18px;
    }
    thead th {
      background: #1e40af;
      color: #fff;
      font-weight: 700;
      padding: 9px 10px;
      text-align: right;
      font-size: 11px;
    }
    thead th:first-child { border-radius: 0 8px 0 0; }
    thead th:last-child  { border-radius: 8px 0 0 0; }
    tbody td {
      padding: 9px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: 2px solid #e2e8f0; }
    tfoot td {
      padding: 8px 10px;
      font-size: 12px;
    }
    .mono   { font-family: 'Courier New', monospace; font-size: 10.5px; color: #64748b; }
    .center { text-align: center; }
    .num    { text-align: left; font-weight: 600; }
    .bold   { font-weight: 800; }
    .green  { color: #15803d; }
    .red    { color: #dc2626; }
    .blue   { color: #1e40af; }
    .amber  { color: #b45309; }

    /* ── Totals ── */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 16px;
    }
    .notes-box {
      flex: 1;
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .notes-box .nt {
      font-size: 10px;
      font-weight: 800;
      color: #92400e;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .notes-box p { font-size: 12px; color: #78350f; line-height: 1.6; }

    .totals-box {
      min-width: 250px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }
    .total-row .t-lbl { color: #475569; font-weight: 500; }
    .total-row .t-val { font-weight: 700; color: #0f172a; }
    .total-row.disc { background: #fff7ed; }
    .total-row.disc .t-lbl { color: #c2410c; }
    .total-row.disc .t-val { color: #c2410c; }
    .total-row.grand {
      background: #1e40af;
      padding: 11px 16px;
    }
    .total-row.grand .t-lbl { color: #bfdbfe; font-weight: 700; font-size: 14px; }
    .total-row.grand .t-val { color: #fff; font-weight: 900; font-size: 18px; }
    .total-row.paid-row { background: #f0fdf4; }
    .total-row.paid-row .t-lbl { color: #15803d; }
    .total-row.paid-row .t-val { color: #15803d; }
    .total-row.due-row  { background: #fef2f2; }
    .total-row.due-row .t-lbl  { color: #dc2626; }
    .total-row.due-row .t-val  { color: #dc2626; }
    .total-row.clear-row { background: #f0fdf4; }
    .total-row.clear-row .t-lbl { color: #15803d; }
    .total-row.clear-row .t-val { color: #15803d; }

    /* ── Status Banner ── */
    .status-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 20px;
      letter-spacing: 0.3px;
    }
    .status-paid    { background: #dcfce7; color: #15803d; border: 2px solid #86efac; }
    .status-partial { background: #fef3c7; color: #92400e; border: 2px solid #fcd34d; }
    .status-unpaid  { background: #fee2e2; color: #dc2626; border: 2px solid #fca5a5; }

    /* ── Signatures ── */
    .signature-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: auto;
      padding-top: 16px;
      border-top: 1.5px dashed #cbd5e1;
    }
    .sig-box { text-align: center; }
    .sig-line {
      height: 44px;
      border-bottom: 1.5px solid #94a3b8;
      margin-bottom: 6px;
    }
    .sig-box p { font-size: 10.5px; color: #64748b; font-weight: 600; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { font-size: 10px; color: #94a3b8; line-height: 1.7; }
    .footer .footer-accent { color: #1e40af; font-weight: 700; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 8mm 10mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="shop-brand">
      <div class="shop-name">الشافعي <span>ستور</span></div>
      <div class="shop-sub">متجر الهواتف والإكسسوارات</div>
      <div class="shop-contact">نظام إدارة المحل — Mobile Shop Control</div>
    </div>
    <div class="inv-info">
      <div class="inv-label">INVOICE / فاتورة بيع</div>
      <div class="inv-title">فاتورة بيع</div>
      <div class="inv-num">${data.invoice_number}</div>
      <span class="inv-status">${statusLabel(data.status)}</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-box">
      <div class="box-title">👤 بيانات العميل</div>
      <div class="info-row">
        <span class="lbl">الاسم</span>
        <span class="val">${data.customer_name ?? 'عميل نقدي'}</span>
      </div>
      ${data.customer_phone ? `
      <div class="info-row">
        <span class="lbl">الهاتف</span>
        <span class="val">${data.customer_phone}</span>
      </div>` : ''}
    </div>
    <div class="info-box">
      <div class="box-title">📋 بيانات الفاتورة</div>
      <div class="info-row">
        <span class="lbl">رقم الفاتورة</span>
        <span class="val" style="font-family:monospace;color:#1e40af">${data.invoice_number}</span>
      </div>
      <div class="info-row">
        <span class="lbl">تاريخ الفاتورة</span>
        <span class="val">${invDate}</span>
      </div>
      <div class="info-row">
        <span class="lbl">تاريخ الطباعة</span>
        <span class="val">${today}</span>
      </div>
      <div class="info-row">
        <span class="lbl">الكاشير</span>
        <span class="val">${data.created_by_name}</span>
      </div>
    </div>
  </div>

  <!-- Items -->
  ${(data.devices.length + data.products.length) > 0 ? `
  <div class="section-title">📦 بنود الفاتورة</div>
  <table>
    <thead>
      <tr>
        <th style="width:32px" class="center">#</th>
        <th>الصنف / الموديل</th>
        <th class="center">IMEI / الكود</th>
        <th class="center">الكمية</th>
        <th class="center">سعر الوحدة</th>
        <th class="center">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${deviceRows}
      ${productRows}
    </tbody>
  </table>
  ` : '<p style="color:#94a3b8;text-align:center;padding:20px">لا توجد بنود</p>'}

  <!-- Bottom: notes + totals -->
  <div class="bottom-section">
    ${data.notes ? `
    <div class="notes-box">
      <div class="nt">📝 ملاحظات</div>
      <p>${data.notes}</p>
    </div>` : '<div style="flex:1"></div>'}

    <div class="totals-box">
      <div class="total-row">
        <span class="t-lbl">إجمالي الأصناف</span>
        <span class="t-val">${fmt(grossTotal)} ج</span>
      </div>
      ${data.discount > 0 ? `
      <div class="total-row disc">
        <span class="t-lbl">الخصم</span>
        <span class="t-val">− ${fmt(data.discount)} ج</span>
      </div>` : ''}
      <div class="total-row grand">
        <span class="t-lbl">الإجمالي النهائي</span>
        <span class="t-val">${fmt(data.total_amount)} ج</span>
      </div>
      ${data.paid_amount > 0 ? `
      <div class="total-row paid-row">
        <span class="t-lbl">✓ المدفوع</span>
        <span class="t-val">${fmt(data.paid_amount)} ج</span>
      </div>` : ''}
      ${data.remaining > 0 ? `
      <div class="total-row due-row">
        <span class="t-lbl">⚠ المتبقي</span>
        <span class="t-val">${fmt(data.remaining)} ج</span>
      </div>` : data.paid_amount > 0 ? `
      <div class="total-row clear-row">
        <span class="t-lbl">حالة السداد</span>
        <span class="t-val">✓ مسدد بالكامل</span>
      </div>` : ''}
    </div>
  </div>

  <!-- Status Banner -->
  <div class="status-banner ${
    data.remaining <= 0 ? 'status-paid' :
    data.paid_amount > 0 ? 'status-partial' : 'status-unpaid'
  }">
    ${data.remaining <= 0
      ? '✅ تم السداد بالكامل — شكراً لتعاملكم مع الشافعي ستور'
      : data.paid_amount > 0
        ? `⚠️ سداد جزئي — المتبقي: ${fmt(data.remaining)} ج`
        : `🔴 لم يتم السداد — المطلوب: ${fmt(data.total_amount)} ج`
    }
  </div>

  <!-- Signatures -->
  <div class="signature-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <p>توقيع العميل</p>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <p>توقيع الكاشير</p>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <p>الختم</p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>
      <span class="footer-accent">الشافعي ستور</span> — متجر الهواتف والإكسسوارات
      &nbsp;|&nbsp; فاتورة رقم <strong>${data.invoice_number}</strong>
      &nbsp;|&nbsp; طُبعت بتاريخ ${today}
    </p>
    <p style="margin-top:3px">شكراً لثقتكم — هذه الفاتورة مستند رسمي يُعتد به</p>
  </div>

</div>
<style>
  .close-btn{position:fixed;top:12px;left:12px;z-index:9999;width:36px;height:36px;border-radius:50%;background:#dc2626;color:#fff;border:none;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;line-height:1}
  @media print{.close-btn{display:none!important}}
</style>
<button class="close-btn" onclick="window.close()">✕</button>
<script>document.fonts.ready.then(() => window.print())</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
