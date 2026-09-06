// src/services/import.service.ts
import * as XLSX from 'xlsx'
import { importRepository } from '@/repositories/import.repository'
import type {
  ImportProductRow,
  ImportDeviceRow,
  ImportResult,
} from '@/repositories/import.repository'
import type { ProductType } from '@/types/database'

// ── Validation Errors ─────────────────────────────────────────────────────────

export interface ParsedRow<T> {
  rowNum:  number
  data?:   T
  errors:  string[]
  valid:   boolean
}

export interface ParseResult<T> {
  type:     'products' | 'devices'
  rows:     ParsedRow<T>[]
  total:    number
  valid:    number
  invalid:  number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function num(v: unknown): number | null {
  const n = Number(v)
  return isNaN(n) ? null : n
}

function isHintRow(row: unknown[]): boolean {
  // row 4 in the sheet is a hint row — skip it
  const first = str(row[0])
  return (
    first.startsWith('مثال') ||
    first.startsWith('YYYY') ||
    first.includes('يُنشأ') ||
    first.includes('— الافتراضي') ||
    (first === '' && row.every(c => str(c).startsWith('مثال') || str(c) === ''))
  )
}

// ── Product Parsing ───────────────────────────────────────────────────────────

function parseProductRow(rawRow: unknown[], rowNum: number): ParsedRow<ImportProductRow> {
  const errors: string[] = []

  const name          = str(rawRow[0])
  const categoryName  = str(rawRow[1])
  const categoryType  = str(rawRow[2]) as ProductType
  const costRaw       = num(rawRow[3])
  const sellRaw       = num(rawRow[4])
  const qtyRaw        = num(rawRow[5])
  const reorderRaw    = num(rawRow[6])
  const unit          = str(rawRow[7]) || 'قطعة'
  const sku           = str(rawRow[8]) || null
  const barcode       = str(rawRow[9]) || null
  const notes         = str(rawRow[10]) || null

  if (!name)         errors.push('اسم المنتج مطلوب')
  if (!categoryName) errors.push('الفئة مطلوبة')
  if (!['accessory', 'spare_part'].includes(categoryType))
    errors.push('نوع الفئة يجب أن يكون: accessory أو spare_part')
  if (costRaw === null || costRaw < 0) errors.push('سعر التكلفة يجب أن يكون رقماً موجباً')
  if (sellRaw === null || sellRaw < 0) errors.push('سعر البيع يجب أن يكون رقماً موجباً')
  if (qtyRaw === null || qtyRaw < 0)   errors.push('الكمية يجب أن تكون رقماً موجباً')

  if (errors.length > 0) return { rowNum, errors, valid: false }

  return {
    rowNum,
    errors: [],
    valid: true,
    data: {
      name,
      category_name:  categoryName,
      category_type:  categoryType,
      cost_price:     costRaw!,
      selling_price:  sellRaw!,
      stock_qty:      Math.round(qtyRaw!),
      reorder_level:  reorderRaw !== null ? Math.round(reorderRaw) : 5,
      unit,
      sku,
      barcode,
      notes,
    },
  }
}

// ── Device Parsing ────────────────────────────────────────────────────────────

function parseDeviceRow(rawRow: unknown[], rowNum: number): ParsedRow<ImportDeviceRow> {
  const errors: string[] = []

  const imei1         = str(rawRow[0]).replace(/\D/g, '')
  const imei2Raw      = str(rawRow[1]).replace(/\D/g, '')
  const brandName     = str(rawRow[2])
  const modelName     = str(rawRow[3])
  const storage       = str(rawRow[4]) || null
  const color         = str(rawRow[5]) || null
  const condition     = str(rawRow[6])
  const costRaw       = num(rawRow[7])
  const sellRaw       = num(rawRow[8])
  const purchaseDateRaw = str(rawRow[9])
  const warrantyRaw   = num(rawRow[10])
  const serialNumber  = str(rawRow[11]) || null
  const notes         = str(rawRow[12]) || null

  if (!imei1 || imei1.length !== 15) errors.push(`IMEI 1 يجب أن يكون 15 رقم (المدخل: "${str(rawRow[0])}")`)
  if (imei2Raw && imei2Raw.length !== 15) errors.push(`IMEI 2 يجب أن يكون 15 رقم أو فارغاً`)
  if (!brandName) errors.push('الماركة مطلوبة')
  if (!modelName) errors.push('الموديل مطلوب')
  if (!['new', 'used', 'refurbished'].includes(condition))
    errors.push('الحالة يجب أن تكون: new أو used أو refurbished')
  if (costRaw === null || costRaw <= 0) errors.push('سعر التكلفة مطلوب ويجب أن يكون رقماً موجباً')

  // validate date
  let purchaseDate = purchaseDateRaw
  if (!purchaseDateRaw) {
    errors.push('تاريخ الشراء مطلوب')
  } else {
    // handle Excel date serial
    const asNum = Number(rawRow[9])
    if (!isNaN(asNum) && asNum > 1000) {
      const d = XLSX.SSF.parse_date_code(asNum)
      purchaseDate = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
      errors.push(`تاريخ الشراء يجب أن يكون بصيغة YYYY-MM-DD (المدخل: "${purchaseDateRaw}")`)
    }
  }

  if (errors.length > 0) return { rowNum, errors, valid: false }

  return {
    rowNum,
    errors: [],
    valid: true,
    data: {
      imei1,
      imei2:           imei2Raw || null,
      brand_name:      brandName,
      model_name:      modelName,
      storage,
      color,
      condition,
      cost_price:      costRaw!,
      selling_price:   sellRaw ?? costRaw!,
      purchase_date:   purchaseDate,
      warranty_months: warrantyRaw !== null ? Math.round(warrantyRaw) : 12,
      serial_number:   serialNumber,
      notes,
    },
  }
}

// ── Sheet Detection ───────────────────────────────────────────────────────────

function detectSheet(wb: XLSX.WorkBook): { sheetName: string; type: 'products' | 'devices' } | null {
  for (const name of wb.SheetNames) {
    if (name.includes('منتج') || name.includes('إكسسوار') || name.toLowerCase().includes('product')) {
      return { sheetName: name, type: 'products' }
    }
    if (name.includes('جهاز') || name.includes('موبايل') || name.toLowerCase().includes('device')) {
      return { sheetName: name, type: 'devices' }
    }
  }
  return null
}

// ── Service ───────────────────────────────────────────────────────────────────

export const importService = {

  // ── Parse file → preview rows (no DB calls) ───────────────────────────────
  parseFile: (file: File): Promise<ParseResult<ImportProductRow> | ParseResult<ImportDeviceRow>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const wb   = XLSX.read(data, { type: 'array' })

          const detected = detectSheet(wb)
          if (!detected) {
            // try first sheet and guess
            const firstSheet = wb.SheetNames[0]
            if (!firstSheet) throw new Error('الملف فارغ أو لا يحتوي على بيانات')
            // guess by first header cell
            const ws = wb.Sheets[firstSheet]
            const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]
            const header = String((rows[2] as unknown[] ?? [])[0] ?? '').toLowerCase()
            if (header.includes('imei') || header.includes('ماركة')) {
              return resolve(importService._parseSheet(wb, firstSheet, 'devices'))
            }
            return resolve(importService._parseSheet(wb, firstSheet, 'products'))
          }

          resolve(importService._parseSheet(wb, detected.sheetName, detected.type))
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      }
      reader.onerror = () => reject(new Error('فشل قراءة الملف'))
      reader.readAsArrayBuffer(file)
    })
  },

  _parseSheet: (
    wb:        XLSX.WorkBook,
    sheetName: string,
    type:      'products' | 'devices',
  ): ParseResult<ImportProductRow> | ParseResult<ImportDeviceRow> => {
    const ws   = wb.Sheets[sheetName]
    const all  = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]

    // rows start at index 4 (0-based) = row 5 in Excel (skipping title/legend/headers/hints)
    const dataRows = all.slice(4).filter(row => {
      // skip empty rows
      if (!row || row.length === 0) return false
      if (row.every(c => str(c) === '')) return false
      // skip hint rows (row 4 content sometimes bleeds through)
      if (isHintRow(row)) return false
      return true
    })

    if (type === 'products') {
      const parsed = dataRows.map((row, i) =>
        parseProductRow(row, i + 5)
      ) as ParsedRow<ImportProductRow>[]

      return {
        type: 'products',
        rows: parsed,
        total:   parsed.length,
        valid:   parsed.filter(r => r.valid).length,
        invalid: parsed.filter(r => !r.valid).length,
      } as ParseResult<ImportProductRow>
    } else {
      const parsed = dataRows.map((row, i) =>
        parseDeviceRow(row, i + 5)
      ) as ParsedRow<ImportDeviceRow>[]

      return {
        type: 'devices',
        rows: parsed,
        total:   parsed.length,
        valid:   parsed.filter(r => r.valid).length,
        invalid: parsed.filter(r => !r.valid).length,
      } as ParseResult<ImportDeviceRow>
    }
  },

  // ── Execute import (after user confirms) ──────────────────────────────────
  importProducts: (
    rows:       ImportProductRow[],
    userId:     string,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ImportResult> =>
    importRepository.importProducts(rows, userId, onProgress),

  importDevices: (
    rows:       ImportDeviceRow[],
    userId:     string,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ImportResult> =>
    importRepository.importDevices(rows, userId, onProgress),
}
