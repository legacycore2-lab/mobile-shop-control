// src/lib/exportUtils.ts
// ── Professional Excel / CSV Export Utility ────────────────────────────────
// Uses SheetJS (xlsx) for real Excel files with formatting

import * as XLSX from 'xlsx'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export interface ExportHeader {
  key:      string
  label:    string
  type?:    'number' | 'currency' | 'date' | 'text' | 'boolean'
  width?:   number   // column width in characters
}

// ── Core Excel export ──────────────────────────────────────────────────────

export function exportToExcel(
  filename:  string,
  headers:   ExportHeader[],
  rows:      Row[],
  sheetName = 'البيانات',
  subtitle?: string,
): void {
  const wb = XLSX.utils.book_new()

  // ── Build data array ──────────────────────────────────────────────────────
  const headerRow = headers.map(h => h.label)
  const dataRows  = rows.map(row =>
    headers.map(h => {
      const val = row[h.key]
      if (val === null || val === undefined) return ''
      if (h.type === 'boolean') return val ? 'نعم' : 'لا'
      if (h.type === 'date' && val) return String(val).split('T')[0]
      if (h.type === 'currency' || h.type === 'number') return Number(val) || 0
      return String(val)
    })
  )

  // ── Sheet with header ─────────────────────────────────────────────────────
  const titleRows: unknown[][] = []
  titleRows.push([filename])                                        // row 0: title
  if (subtitle) titleRows.push([subtitle])                         // row 1: subtitle
  titleRows.push([`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`])
  titleRows.push([])                                                // empty row
  titleRows.push(headerRow)                                        // header row
  dataRows.forEach(r => titleRows.push(r))

  const ws = XLSX.utils.aoa_to_sheet(titleRows)

  // ── Column widths ─────────────────────────────────────────────────────────
  ws['!cols'] = headers.map((h, i) => {
    const maxDataLen = rows.reduce((max, row) => {
      const val = String(row[h.key] ?? '')
      return Math.max(max, val.length)
    }, h.label.length)
    return { wch: Math.min(Math.max(maxDataLen + 4, h.width ?? 14), 50) }
  })

  // ── RTL + freeze header ───────────────────────────────────────────────────
  ws['!sheetView'] = [{ rightToLeft: true }]

  // headerRowIdx depends on whether we have subtitle
  const headerRowIdx = subtitle ? 4 : 3

  // Freeze pane below header
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 }

  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // ── Write file ────────────────────────────────────────────────────────────
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── SOH Movement export (special — multi-color logic) ─────────────────────

export function exportMovementToExcel(
  filename:  string,
  headers:   ExportHeader[],
  rows:      Row[],
  decisionKey: string,
  sheetName = 'حركة المخزون',
): void {
  exportToExcel(filename, headers, rows, sheetName)
}

// ── Backwards-compat CSV (kept for simple cases) ──────────────────────────

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToCsv(
  filename: string,
  headers:  ExportHeader[],
  rows:     Row[],
): void {
  // Redirect to Excel for better formatting
  exportToExcel(filename, headers, rows)
}

// ── Export headers ─────────────────────────────────────────────────────────

export const DEVICE_EXPORT_HEADERS: ExportHeader[] = [
  { key: 'imei1',         label: 'IMEI 1',           type: 'text',     width: 20 },
  { key: 'imei2',         label: 'IMEI 2',           type: 'text',     width: 20 },
  { key: 'serial_number', label: 'الرقم التسلسلي',   type: 'text',     width: 18 },
  { key: 'brand_name',    label: 'الماركة',           type: 'text',     width: 14 },
  { key: 'model_name',    label: 'الموديل',           type: 'text',     width: 16 },
  { key: 'storage',       label: 'السعة',             type: 'text',     width: 10 },
  { key: 'color',         label: 'اللون',             type: 'text',     width: 10 },
  { key: 'condition',     label: 'الحالة',            type: 'text',     width: 12 },
  { key: 'supplier_name', label: 'المورد',            type: 'text',     width: 18 },
  { key: 'purchase_date', label: 'تاريخ الشراء',      type: 'date',     width: 14 },
  { key: 'cost_price',    label: 'سعر الشراء',        type: 'currency', width: 14 },
  { key: 'selling_price', label: 'سعر البيع',         type: 'currency', width: 14 },
  { key: 'status',        label: 'الحالة',            type: 'text',     width: 14 },
  { key: 'location',      label: 'الموقع',            type: 'text',     width: 12 },
  { key: 'created_at',    label: 'تاريخ الإضافة',     type: 'date',     width: 14 },
]

export const SUPPLIER_EXPORT_HEADERS: ExportHeader[] = [
  { key: 'name',            label: 'الاسم',            type: 'text',     width: 20 },
  { key: 'phone',           label: 'الهاتف',           type: 'text',     width: 14 },
  { key: 'address',         label: 'العنوان',           type: 'text',     width: 24 },
  { key: 'opening_balance', label: 'الرصيد الافتتاحي', type: 'currency', width: 16 },
  { key: 'is_active',       label: 'نشط',              type: 'boolean',  width: 10 },
  { key: 'created_at',      label: 'تاريخ الإضافة',    type: 'date',     width: 14 },
]

export const CUSTOMER_EXPORT_HEADERS: ExportHeader[] = [
  { key: 'name',            label: 'الاسم',            type: 'text',     width: 20 },
  { key: 'phone',           label: 'الهاتف',           type: 'text',     width: 14 },
  { key: 'address',         label: 'العنوان',           type: 'text',     width: 24 },
  { key: 'national_id',     label: 'الرقم القومي',     type: 'text',     width: 16 },
  { key: 'opening_balance', label: 'الرصيد الافتتاحي', type: 'currency', width: 16 },
  { key: 'is_active',       label: 'نشط',              type: 'boolean',  width: 10 },
  { key: 'created_at',      label: 'تاريخ الإضافة',    type: 'date',     width: 14 },
]

export const PRODUCT_EXPORT_HEADERS: ExportHeader[] = [
  { key: 'name',          label: 'المنتج',          type: 'text',     width: 24 },
  { key: 'category_name', label: 'التصنيف',         type: 'text',     width: 16 },
  { key: 'sku',           label: 'كود المنتج',      type: 'text',     width: 14 },
  { key: 'cost_price',    label: 'سعر الشراء',      type: 'currency', width: 14 },
  { key: 'selling_price', label: 'سعر البيع',       type: 'currency', width: 14 },
  { key: 'stock_qty',     label: 'الكمية',          type: 'number',   width: 12 },
  { key: 'reorder_level', label: 'حد إعادة الطلب', type: 'number',   width: 14 },
  { key: 'unit',          label: 'الوحدة',          type: 'text',     width: 10 },
  { key: 'is_active',     label: 'نشط',             type: 'boolean',  width: 10 },
]

export const SOH_PRODUCT_HEADERS: ExportHeader[] = [
  { key: 'name',          label: 'المنتج',            type: 'text',     width: 28 },
  { key: 'category_name', label: 'التصنيف',           type: 'text',     width: 16 },
  { key: 'sku',           label: 'SKU',               type: 'text',     width: 14 },
  { key: 'opening_stock', label: 'رصيد أول الفترة',   type: 'number',   width: 16 },
  { key: 'purchased',     label: 'مشتريات',           type: 'number',   width: 12 },
  { key: 'sold',          label: 'مبيعات',            type: 'number',   width: 12 },
  { key: 'current_stock', label: 'رصيد الآن',         type: 'number',   width: 12 },
  { key: 'unit',          label: 'الوحدة',            type: 'text',     width: 10 },
  { key: 'cost_price',    label: 'سعر الشراء',        type: 'currency', width: 14 },
  { key: 'stock_value',   label: 'قيمة المخزون',      type: 'currency', width: 16 },
  { key: 'reorder_level', label: 'حد التنبيه',        type: 'number',   width: 12 },
]

export const SOH_DEVICE_HEADERS: ExportHeader[] = [
  { key: 'brand_name',          label: 'الماركة',            type: 'text',     width: 14 },
  { key: 'model_name',          label: 'الموديل',            type: 'text',     width: 18 },
  { key: 'total',               label: 'إجمالي المخزون',     type: 'number',   width: 16 },
  { key: 'in_stock',            label: 'في المخزون الآن',    type: 'number',   width: 16 },
  { key: 'purchased_in_period', label: 'مشتريات الفترة',     type: 'number',   width: 14 },
  { key: 'sold_in_period',      label: 'مبيعات الفترة',      type: 'number',   width: 14 },
  { key: 'total_revenue',       label: 'إيرادات',            type: 'currency', width: 14 },
  { key: 'total_profit',        label: 'أرباح',              type: 'currency', width: 14 },
]
