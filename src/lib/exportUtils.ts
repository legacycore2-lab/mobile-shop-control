// src/lib/exportUtils.ts
// ── Excel Export Utility ───────────────────────────────────────────────────
import { buildXlsx } from '@/lib/xlsxWriter'
import type { XlsxColumn, XlsxColumnKind, XlsxValue } from '@/lib/xlsxWriter'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export interface ExportHeader {
  key:      string
  label:    string
  type?:    'number' | 'currency' | 'date' | 'text' | 'boolean'
  width?:   number
}

// ── Excel export (.xlsx حقيقي) ────────────────────────────────────────────────
// الأعمدة النصية (IMEI، الهاتف، الرقم القومي، الكود) بتتحفظ نص عشان Excel ما يحوّلهاش لأس علمي.

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function columnKind(type: ExportHeader['type']): XlsxColumnKind {
  if (type === 'number' || type === 'currency' || type === 'date') return type
  return 'text'
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function cellValue(val: unknown, type: ExportHeader['type']): XlsxValue {
  if (val === null || val === undefined) return null
  if (type === 'boolean')  return val ? 'نعم' : 'لا'
  if (type === 'number' || type === 'currency') return toNumber(val)
  if (type === 'date')     return String(val).split('T')[0]
  // عمود من غير نوع: الأرقام تفضل أرقام، وأي حاجة تانية نص
  if (type === undefined && typeof val === 'number') return Number.isFinite(val) ? val : null
  return String(val)
}

function columnOf(header: ExportHeader, rows: Row[]): XlsxColumn {
  const kind = header.type === undefined && rows.some(r => typeof r[header.key] === 'number')
    ? 'number'
    : columnKind(header.type)
  return { header: header.label, kind, width: header.width }
}

export function buildExportBytes(
  headers:   ExportHeader[],
  rows:      Row[],
  sheetName = 'البيانات',
  subtitle?: string,
): Uint8Array {
  return buildXlsx({
    name:    sheetName,
    title:   subtitle ?? null,
    columns: headers.map(h => columnOf(h, rows)),
    rows:    rows.map(row => headers.map(h => cellValue(row[h.key], h.type))),
  })
}

export function exportToExcel(
  filename:  string,
  headers:   ExportHeader[],
  rows:      Row[],
  sheetName = 'البيانات',
  subtitle?: string,
): void {
  const dateStr = new Date().toISOString().split('T')[0]
  const bytes   = buildExportBytes(headers, rows, sheetName, subtitle)
  downloadBlob(new Blob([bytes.slice()], { type: XLSX_MIME }), `${filename}_${dateStr}.xlsx`)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── Export headers (unchanged) ─────────────────────────────────────────────

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
