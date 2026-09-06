// src/pages/pos/SaleInvoicePrint.ts
// Generates a professional printable sale invoice HTML

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
  invoice_number: string
  invoice_date:   string
  status:         string
  customer_name:  string | null
  customer_phone: string | null
  created_by_name: string
  total_amount:   number
  paid_amount:    number
  discount:       number
  remaining:      number
  notes:          string | null
  devices:        DeviceLine[]
  products:       ProductLine[]
}

function statusLabel(s: string) {
  if (s === 'confirmed') return 'مؤكدة'
  if (s === 'cancelled') return 'ملغية'
  return 'مسودة'
}

export function printSaleInvoice(data: SaleInvoicePrintData) {
  const today    = new Date().toLocaleDateString('ar-EG')
  const invDate  = new Date(data.invoice_date).toLocaleDateString('ar-EG')
  const isConf   = data.status === 'confirmed'

  const totalCost = data.devices.reduce((s, d) => s + d.cost_price, 0)
                  + data.products.reduce((s, p) => s + p.cost_price * p.quantity, 0)
  const profit    = data.total_amount - totalCost

  const deviceRows = data.devices.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${d.brand_name} ${d.model_name}</strong></td>
      <td class="mono">${d.imei1}</td>
      <td class="num">1</td>
      <td class="num">${fmt(d.actual_selling_price)} ج</td>
      <td class="num bold">${fmt(d.actual_selling_price)} ج</td>
    </tr>
  `).join('')

  const productRows = data.products.map((p, i) => `
    <tr>
      <td>${data.devices.length + i + 1}</td>
      <td>${p.product_name}</td>
      <td>—</td>
      <td class="num">${p.quantity} ${p.unit}</td>
      <td class="num">${fmt(p.unit_price)} ج</td>
      <td class="num bold">${fmt(p.subtotal)} ج</td>
    </tr>
  `).join('')

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة بيع ${data.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      direction: rtl;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 14mm 10mm;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 14px;
      border-bottom: 3px solid #1d4ed8;
      margin-bottom: 18px;
    }
    .shop-info h1 {
      font-size: 26px;
      font-weight: 900;
      color: #1d4ed8;
      letter-spacing: -0.5px;
    }
    .shop-info p {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
    }
    .inv-badge {
      text-align: left;
    }
    .inv-badge .inv-title {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
    }
    .inv-badge .inv-num {
      font-size: 14px;
      font-weight: 700;
      color: #1d4ed8;
      font-family: 'Courier New', monospace;
      margin-top: 2px;
    }
    .inv-badge .inv-status {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 700;
      background: ${isConf ? '#dcfce7' : '#fee2e2'};
      color: ${isConf ? '#15803d' : '#b91c1c'};
    }

    /* ── Info Grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .info-box .box-title {
      font-size: 10px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .info-row .lbl { color: #6b7280; }
    .info-row .val { font-weight: 600; color: #111827; }

    /* ── Items Table ── */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #1d4ed8;
      border-bottom: 2px solid #dbeafe;
      padding-bottom: 5px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 20px;
    }
    thead th {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      padding: 8px 10px;
      text-align: right;
      border: 1px solid #bfdbfe;
      font-size: 11px;
    }
    tbody td {
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #f9fafb; }
    tbody tr:last-child td { border-bottom: 2px solid #d1d5db; }
    .mono  { font-family: 'Courier New', monospace; font-size: 11px; color: #6b7280; }
    .num   { text-align: center; }
    .bold  { font-weight: 700; }
    .green { color: #15803d; }
    .red   { color: #dc2626; }
    .blue  { color: #1d4ed8; }

    /* ── Totals ── */
    .totals-wrap {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 20px;
    }
    .notes-box {
      flex: 1;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 12px;
    }
    .notes-box .nt { font-size: 10px; font-weight: 700; color: #92400e; margin-bottom: 5px; }
    .notes-box p   { font-size: 12px; color: #78350f; line-height: 1.6; }
    .totals-table {
      min-width: 240px;
    }
    .totals-table table {
      margin: 0;
    }
    .totals-table td {
      padding: 6px 12px;
      font-size: 13px;
    }
    .totals-table .lbl-col { color: #374151; font-weight: 500; text-align: right; }
    .totals-table .val-col { font-weight: 700; color: #111827; text-align: left; }
    .totals-table .grand-row td {
      background: #1d4ed8;
      color: #fff !important;
      font-size: 15px;
      font-weight: 900;
      padding: 9px 12px;
    }
    .totals-table .paid-row td  { background: #dcfce7; color: #15803d !important; }
    .totals-table .due-row td   { background: #fee2e2; color: #dc2626 !important; }
    .totals-table .zero-row td  { background: #dcfce7; color: #15803d !important; }

    /* ── Payment status banner ── */
    .status-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 20px;
    }
    .status-paid   { background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; }
    .status-partial { background: #fef3c7; color: #92400e; border: 1.5px solid #fcd34d; }
    .status-unpaid  { background: #fee2e2; color: #dc2626; border: 1.5px solid #fca5a5; }

    /* ── Signature ── */
    .signature-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px dashed #d1d5db;
    }
    .sig-box { text-align: center; }
    .sig-box .sig-line {
      height: 40px;
      border-bottom: 1px solid #9ca3af;
      margin-bottom: 6px;
    }
    .sig-box p { font-size: 10px; color: #6b7280; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
    }

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
    <div class="shop-info">
      <h1>🏪 Mobile Shop</h1>
      <p>نظام إدارة المحل — Mobile Shop Control</p>
    </div>
    <div class="inv-badge">
      <div class="inv-title">فاتورة بيع</div>
      <div class="inv-num">${data.invoice_number}</div>
      <span class="inv-status">${statusLabel(data.status)}</span>
    </div>
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <!-- Customer -->
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
    <!-- Invoice Info -->
    <div class="info-box">
      <div class="box-title">📋 بيانات الفاتورة</div>
      <div class="info-row">
        <span class="lbl">رقم الفاتورة</span>
        <span class="val" style="font-family:monospace">${data.invoice_number}</span>
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
        <th style="width:30px">#</th>
        <th>الصنف</th>
        <th>IMEI / الكود</th>
        <th class="num">الكمية</th>
        <th class="num">سعر الوحدة</th>
        <th class="num">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${deviceRows}
      ${productRows}
    </tbody>
  </table>
  ` : ''}

  <!-- Totals + Notes -->
  <div class="totals-wrap">
    ${data.notes ? `
    <div class="notes-box">
      <div class="nt">📝 ملاحظات</div>
      <p>${data.notes}</p>
    </div>` : '<div style="flex:1"></div>'}

    <div class="totals-table">
      <table>
        <tbody>
          <tr>
            <td class="lbl-col">إجمالي الأصناف</td>
            <td class="val-col">${fmt(data.total_amount + data.discount)} ج</td>
          </tr>
          ${data.discount > 0 ? `
          <tr>
            <td class="lbl-col" style="color:#dc2626">الخصم</td>
            <td class="val-col" style="color:#dc2626">- ${fmt(data.discount)} ج</td>
          </tr>` : ''}
          <tr class="grand-row">
            <td class="lbl-col">الإجمالي النهائي</td>
            <td class="val-col">${fmt(data.total_amount)} ج</td>
          </tr>
          ${data.paid_amount > 0 ? `
          <tr class="paid-row">
            <td class="lbl-col">المدفوع</td>
            <td class="val-col">✓ ${fmt(data.paid_amount)} ج</td>
          </tr>` : ''}
          ${data.remaining > 0 ? `
          <tr class="due-row">
            <td class="lbl-col">المتبقي</td>
            <td class="val-col">⚠ ${fmt(data.remaining)} ج</td>
          </tr>` : data.paid_amount > 0 ? `
          <tr class="zero-row">
            <td class="lbl-col">حالة السداد</td>
            <td class="val-col">✓ مسدد بالكامل</td>
          </tr>` : ''}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Payment status banner -->
  <div class="status-banner ${
    data.remaining <= 0 ? 'status-paid' :
    data.paid_amount > 0 ? 'status-partial' : 'status-unpaid'
  }">
    ${data.remaining <= 0
      ? '✅ تم السداد بالكامل — شكراً لتعاملكم معنا'
      : data.paid_amount > 0
        ? `⚠️ سداد جزئي — المتبقي: ${fmt(data.remaining)} ج`
        : `🔴 لم يتم السداد — المطلوب: ${fmt(data.total_amount)} ج`
    }
  </div>

  <!-- Signature -->
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
    <p>Mobile Shop Control — نظام إدارة المحل &nbsp;|&nbsp; فاتورة رقم ${data.invoice_number} &nbsp;|&nbsp; طُبعت بتاريخ ${today}</p>
    <p style="margin-top:3px; color:#d1d5db">شكراً لثقتكم — هذه الفاتورة مستند رسمي يُعتد به</p>
  </div>

</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
