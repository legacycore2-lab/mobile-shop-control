// src/pages/purchases/LabelPrintModal.tsx
import { useEffect, useRef, useState } from 'react'
import { X, Printer, Tag, Smartphone, Package, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { fmt } from '@/constants/statusMaps'
import type { InvoiceDetailDevice, InvoiceDetailProduct } from '@/repositories/purchases.repository'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeviceLabelData {
  type: 'device'
  device_id: string
  brand:     string
  model:     string
  imei1:     string
  imei2?:    string
  storage?:  string
  color?:    string
  condition: string
  cost_price:    number
  selling_price: number
  warranty_months?: number
  supplier_name?: string
  invoice_number?: string
}

export interface ProductLabelData {
  type: 'product'
  product_id: string
  name:        string
  category?:   string
  sku?:        string
  barcode?:    string
  cost_price:    number
  selling_price: number
  quantity?:   number
  unit?:       string
}

export type LabelData = DeviceLabelData | ProductLabelData

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLabelCode(data: LabelData): string {
  if (data.type === 'device') return data.imei1
  return data.barcode ?? data.sku ?? data.product_id.slice(0, 12)
}

function getLabelTitle(data: LabelData): string {
  if (data.type === 'device') return `${data.brand} ${data.model}`
  return data.name
}

// ── Barcode SVG ───────────────────────────────────────────────────────────────

function BarcodeDisplay({ code, width = 200 }: { code: string; width?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, code, {
        format:      'CODE128',
        width:       1.5,
        height:      50,
        displayValue: true,
        fontSize:    11,
        margin:      6,
        background:  '#ffffff',
        lineColor:   '#000000',
      })
    } catch { /* ignore */ }
  }, [code])
  return <svg ref={ref} style={{ width, maxWidth: '100%' }} />
}

// ── Print engine ──────────────────────────────────────────────────────────────

async function printLabels(items: { data: LabelData; copies: number }[], shopName: string) {
  const today = new Date().toLocaleDateString('ar-EG')

  const labelBlocks: string[] = []

  for (const { data, copies } of items) {
    const code = getLabelCode(data)
    const title = getLabelTitle(data)

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    try {
      JsBarcode(svgEl, code, { format: 'CODE128', width: 1.5, height: 45, displayValue: true, fontSize: 10, margin: 4 })
    } catch { /* ignore */ }
    const barcodeStr = svgEl.outerHTML

    const labelHtml = `
      <div class="label">
        <div class="label-header">
          <span class="shop-name">${shopName}</span>
          <span class="date">${today}</span>
        </div>
        <div class="title">${title}</div>
        ${data.type === 'device' ? `
          <div class="info-grid">
            <div class="info-row"><span class="info-label">IMEI 1</span><span class="info-value">${data.imei1}</span></div>
            ${data.imei2 ? `<div class="info-row"><span class="info-label">IMEI 2</span><span class="info-value">${data.imei2}</span></div>` : ''}
            ${data.storage ? `<div class="info-row"><span class="info-label">التخزين</span><span class="info-value">${data.storage}</span></div>` : ''}
            ${data.color ? `<div class="info-row"><span class="info-label">اللون</span><span class="info-value">${data.color}</span></div>` : ''}
            <div class="info-row"><span class="info-label">الحالة</span><span class="info-value">${data.condition === 'new' ? 'جديد' : data.condition === 'used' ? 'مستعمل' : 'مجدد'}</span></div>
            ${data.warranty_months ? `<div class="info-row"><span class="info-label">الضمان</span><span class="info-value">${data.warranty_months} شهر</span></div>` : ''}
            ${data.supplier_name ? `<div class="info-row"><span class="info-label">المورد</span><span class="info-value">${data.supplier_name}</span></div>` : ''}
            ${data.invoice_number ? `<div class="info-row"><span class="info-label">الفاتورة</span><span class="info-value">${data.invoice_number}</span></div>` : ''}
          </div>
        ` : `
          <div class="info-grid">
            ${data.category ? `<div class="info-row"><span class="info-label">الفئة</span><span class="info-value">${data.category}</span></div>` : ''}
            ${data.sku ? `<div class="info-row"><span class="info-label">SKU</span><span class="info-value">${data.sku}</span></div>` : ''}
            ${data.quantity ? `<div class="info-row"><span class="info-label">الكمية</span><span class="info-value">${data.quantity} ${data.unit ?? 'قطعة'}</span></div>` : ''}
          </div>
        `}
        <div class="prices">
          <div class="price-box cost">
            <div class="price-label">سعر الشراء</div>
            <div class="price-value">${fmt(data.cost_price)} ج</div>
          </div>
          <div class="price-box sell">
            <div class="price-label">سعر البيع</div>
            <div class="price-value">${fmt(data.selling_price)} ج</div>
          </div>
        </div>
        <div class="codes">
          <div class="barcode-section">${barcodeStr}</div>
        </div>
      </div>
    `
    for (let i = 0; i < copies; i++) labelBlocks.push(labelHtml)
  }

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
  <meta charset="UTF-8"><title>طباعة ليبلات</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'); *{font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif!important} body{background:#f5f5f5;direction:rtl;}
    .labels-wrap { display:flex; flex-wrap:wrap; gap:8px; padding:10px; justify-content:center; }
    .label { width:85mm; background:#fff; border:1px solid #ddd; border-radius:6px; padding:8px; page-break-inside:avoid; }
    .label-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #eee; }
    .shop-name { font-size:9px; font-weight:800; color:#1d4ed8; }
    .date { font-size:8px; color:#9ca3af; }
    .title { font-size:13px; font-weight:800; color:#111; margin-bottom:6px; text-align:center; }
    .info-grid { margin-bottom:6px; border:1px solid #f0f0f0; border-radius:4px; overflow:hidden; }
    .info-row { display:flex; justify-content:space-between; padding:3px 6px; border-bottom:1px solid #f5f5f5; }
    .info-row:last-child { border-bottom:none; }
    .info-label { font-size:9px; color:#6b7280; }
    .info-value { font-size:9px; font-weight:600; color:#111; }
    .prices { display:flex; gap:4px; margin-bottom:6px; }
    .price-box { flex:1; padding:4px 6px; border-radius:4px; text-align:center; }
    .price-box.cost { background:#fff7ed; border:1px solid #fed7aa; }
    .price-box.sell { background:#f0fdf4; border:1px solid #bbf7d0; }
    .price-label { font-size:8px; color:#6b7280; }
    .price-value { font-size:12px; font-weight:800; }
    .cost .price-value { color:#c2410c; }
    .sell .price-value { color:#15803d; }
    .codes { border-top:1px solid #eee; padding-top:6px; }
    .barcode-section { display:flex; align-items:center; justify-content:center; }
    .barcode-section svg { width:100%; height:auto; }
    @media print {
      body { background:#fff; }
      .labels-wrap { padding:0; gap:4px; }
      .label { border:1px solid #ccc; }
    }
  </style>
</head><body>
<div class="labels-wrap">${labelBlocks.join('')}</div>
<script>document.fonts.ready.then(()=>window.print())<\/script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Single Label Modal (الاستخدام القديم) ────────────────────────────────────

export function LabelPrintModal({ data, onClose }: { data: LabelData; onClose: () => void }) {
  const [copies, setCopies] = useState(1)
  const code  = getLabelCode(data)
  const title = getLabelTitle(data)

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">طباعة ليبل</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              {data.type === 'device'
                ? <Smartphone size={14} className="text-blue-600 dark:text-blue-400" />
                : <Package size={14} className="text-purple-600 dark:text-purple-400" />}
              <span className="text-sm font-bold text-gray-900 dark:text-white">{title}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">سعر الشراء</div>
                <div className="text-base font-bold text-orange-700 dark:text-orange-400">{fmt(data.cost_price)} ج</div>
              </div>
              <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">سعر البيع</div>
                <div className="text-base font-bold text-green-700 dark:text-green-400">{fmt(data.selling_price)} ج</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              معاينة الباركود
            </p>
            <div className="flex items-center justify-center">
              <BarcodeDisplay code={code} width={260} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">عدد النسخ</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setCopies(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors">−</button>
              <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">{copies}</span>
              <button onClick={() => setCopies(c => Math.min(10, c + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors">+</button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            إغلاق
          </button>
          <button onClick={() => void printLabels([{ data, copies }], 'Mobile Shop')}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2">
            <Printer size={14} /> طباعة {copies > 1 ? `(${copies} نسخ)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk Label Modal — بعد تأكيد الفاتورة ────────────────────────────────────

interface BulkItem {
  id:     string
  data:   LabelData
  copies: number
  checked: boolean
}

export function BulkLabelPrintModal({
  devices,
  products,
  invoiceNumber,
  supplierName,
  onClose,
}: {
  devices:       InvoiceDetailDevice[]
  products:      InvoiceDetailProduct[]
  invoiceNumber: string
  supplierName:  string
  onClose:       () => void
}) {
  const [printing, setPrinting] = useState(false)
  const [showDevices,  setShowDevices]  = useState(true)
  const [showProducts, setShowProducts] = useState(true)

  // بنيّ الآيتمز من الأجهزة والمنتجات
  const initialItems = (): BulkItem[] => {
    const devItems: BulkItem[] = devices.map(d => ({
      id: d.id,
      copies: 1,
      checked: true,
      data: {
        type:            'device',
        device_id:       d.device_id,
        brand:           d.brand_name,
        model:           d.model_name,
        imei1:           d.imei1,
        imei2:           d.imei2 ?? undefined,
        storage:         d.storage ?? undefined,
        color:           d.color   ?? undefined,
        condition:       d.condition,
        cost_price:      d.cost_price,
        selling_price:   d.selling_price,
        warranty_months: d.warranty_months || undefined,
        supplier_name:   supplierName,
        invoice_number:  invoiceNumber,
      } satisfies DeviceLabelData,
    }))

    const prdItems: BulkItem[] = products.map(p => ({
      id: p.id,
      copies: p.quantity,   // افتراضي: نسخة لكل وحدة
      checked: true,
      data: {
        type:          'product',
        product_id:    p.product_id,
        name:          p.product_name,
        category:      p.category_name,
        sku:           p.sku    ?? undefined,
        barcode:       p.barcode ?? undefined,
        cost_price:    p.unit_price,
        selling_price: p.selling_price,
        quantity:      p.quantity,
        unit:          p.unit,
      } satisfies ProductLabelData,
    }))

    return [...devItems, ...prdItems]
  }

  const [items, setItems] = useState<BulkItem[]>(initialItems)

  const deviceItems  = items.filter(i => i.data.type === 'device')
  const productItems = items.filter(i => i.data.type === 'product')
  const checkedCount = items.filter(i => i.checked).length
  const allChecked   = items.every(i => i.checked)

  function toggleItem(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function setCopies(id: string, val: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, copies: Math.max(1, Math.min(20, val)) } : i))
  }

  function toggleAll() {
    const next = !allChecked
    setItems(prev => prev.map(i => ({ ...i, checked: next })))
  }

  async function handlePrint() {
    const selected = items.filter(i => i.checked)
    if (!selected.length) return
    setPrinting(true)
    try {
      await printLabels(selected.map(i => ({ data: i.data, copies: i.copies })), 'Mobile Shop')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-green-50 dark:bg-green-900/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <Printer size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">طباعة ليبلات الفاتورة</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {invoiceNumber} · {devices.length} جهاز · {products.length} منتج
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Select All bar */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <button onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {allChecked
              ? <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
              : <Square size={16} className="text-gray-400" />}
            تحديد الكل
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {checkedCount} من {items.length} محدد
          </span>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* Devices section */}
          {deviceItems.length > 0 && (
            <div>
              <button
                onClick={() => setShowDevices(v => !v)}
                className="flex items-center gap-2 w-full mb-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest"
              >
                <Smartphone size={12} />
                الأجهزة ({deviceItems.length})
                {showDevices ? <ChevronUp size={12} className="mr-auto" /> : <ChevronDown size={12} className="mr-auto" />}
              </button>

              {showDevices && deviceItems.map(item => {
                const d = item.data as DeviceLabelData
                return (
                  <div key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border mb-2 transition-colors ${
                      item.checked
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-50'
                    }`}>
                    <button onClick={() => toggleItem(item.id)} className="flex-shrink-0">
                      {item.checked
                        ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                        : <Square size={18} className="text-gray-300 dark:text-gray-600" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {d.brand} {d.model}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{d.imei1}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-orange-600 dark:text-orange-400">{fmt(d.cost_price)} ج</span>
                        <span className="text-green-600 dark:text-green-400">{fmt(d.selling_price)} ج</span>
                        {d.storage && <span className="text-gray-400">{d.storage}</span>}
                      </div>
                    </div>

                    {/* Copies */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setCopies(item.id, item.copies - 1)}
                        disabled={!item.checked}
                        className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-gray-900 dark:text-white">{item.copies}</span>
                      <button
                        onClick={() => setCopies(item.id, item.copies + 1)}
                        disabled={!item.checked}
                        className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Products section */}
          {productItems.length > 0 && (
            <div>
              <button
                onClick={() => setShowProducts(v => !v)}
                className="flex items-center gap-2 w-full mb-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest"
              >
                <Package size={12} />
                المنتجات ({productItems.length})
                {showProducts ? <ChevronUp size={12} className="mr-auto" /> : <ChevronDown size={12} className="mr-auto" />}
              </button>

              {showProducts && productItems.map(item => {
                const p = item.data as ProductLabelData
                return (
                  <div key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border mb-2 transition-colors ${
                      item.checked
                        ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-50'
                    }`}>
                    <button onClick={() => toggleItem(item.id)} className="flex-shrink-0">
                      {item.checked
                        ? <CheckSquare size={18} className="text-purple-600 dark:text-purple-400" />
                        : <Square size={18} className="text-gray-300 dark:text-gray-600" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.category} · {p.quantity} {p.unit}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-orange-600 dark:text-orange-400">{fmt(p.cost_price)} ج</span>
                        <span className="text-green-600 dark:text-green-400">{fmt(p.selling_price)} ج</span>
                        {p.sku && <span className="text-gray-400 font-mono">{p.sku}</span>}
                      </div>
                    </div>

                    {/* Copies */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setCopies(item.id, item.copies - 1)}
                        disabled={!item.checked}
                        className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-gray-900 dark:text-white">{item.copies}</span>
                      <button
                        onClick={() => setCopies(item.id, item.copies + 1)}
                        disabled={!item.checked}
                        className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            تخطي
          </button>
          <button
            onClick={() => void handlePrint()}
            disabled={checkedCount === 0 || printing}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {printing
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Printer size={14} />}
            طباعة {checkedCount} ليبل
          </button>
        </div>
      </div>
    </div>
  )
}
