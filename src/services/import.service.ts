// src/services/import.service.ts
// قراءة ملف Excel (.xlsx) والتحقق من صفوفه ثم تنفيذ الاستيراد — بدون أي استدعاء لـ Supabase مباشرة.
import readExcelFile from 'read-excel-file/browser'
import { importRepository } from '@/repositories/import.repository'
import type {
  ImportProductRow,
  ImportDeviceRow,
  ImportResult,
} from '@/repositories/import.repository'
import type { ProductType } from '@/types/database'

// ── Public types ──────────────────────────────────────────────────────────────

export interface ParsedRow<T> {
  rowNum: number
  data?:  T
  errors: string[]
  valid:  boolean
}

export interface ParsedSheet<T> {
  sheetName: string
  rows:      ParsedRow<T>[]
  total:     number
  valid:     number
  invalid:   number
}

export interface ParsedWorkbook {
  products: ParsedSheet<ImportProductRow> | null
  devices:  ParsedSheet<ImportDeviceRow>  | null
}

export interface ImportOutcome {
  products: ImportResult | null
  devices:  ImportResult | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES    = 10 * 1024 * 1024
const HEADER_SCAN_ROWS  = 15
const GENERAL_ERROR_ROW = 0

// ── Cells ─────────────────────────────────────────────────────────────────────

type Cell = string | number | boolean | Date | null
type Row  = Cell[]

interface ColumnSpec<K extends string> {
  key:      K
  header:   string
  required: boolean
}

function toCell(v: unknown): Cell {
  if (v instanceof Date || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
  return null
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)))
}

function str(v: Cell): string {
  if (v === null) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10)
  return String(v).trim()
}

function num(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const text = normalizeDigits(str(v)).replace(/[,٬\s]/g, '').replace('٫', '.')
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

function digitsOnly(v: Cell): string {
  return normalizeDigits(str(v)).replace(/\D/g, '')
}

function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

function toIsoDate(v: Cell): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10)

  if (typeof v === 'number') {
    if (v < 1) return null
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000).toISOString().slice(0, 10)
  }

  const text = normalizeDigits(str(v))

  const ymd = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text)
  if (ymd) {
    const [y, m, d] = [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])]
    return isRealDate(y, m, d)
      ? `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      : null
  }

  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text)
  if (dmy) {
    const [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])]
    return isRealDate(y, m, d)
      ? `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      : null
  }

  return null
}

// ── Value aliases (Arabic + English codes) ────────────────────────────────────

const PRODUCT_TYPE_ALIASES: Record<string, ProductType> = {
  accessory:    'accessory',
  'إكسسوار':    'accessory',
  'اكسسوار':    'accessory',
  'إكسسوارات':  'accessory',
  'اكسسوارات':  'accessory',
  spare_part:   'spare_part',
  'قطعة غيار':  'spare_part',
  'قطع غيار':   'spare_part',
}

const CONDITION_ALIASES: Record<string, string> = {
  new:         'new',
  'جديد':      'new',
  used:        'used',
  'مستعمل':    'used',
  refurbished: 'refurbished',
  'مجدد':      'refurbished',
}

function lookup<V>(table: Record<string, V>, v: Cell): V | null {
  const key = str(v).toLowerCase().replace(/\s+/g, ' ')
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null
}

// ── Columns ───────────────────────────────────────────────────────────────────

const PRODUCT_COLUMNS = [
  { key: 'name',    header: 'اسم المنتج',          required: true  },
  { key: 'cat',     header: 'الفئة',               required: true  },
  { key: 'type',    header: 'نوع الفئة',           required: true  },
  { key: 'cost',    header: 'سعر التكلفة',         required: true  },
  { key: 'sell',    header: 'سعر البيع',           required: true  },
  { key: 'qty',     header: 'الكمية الحالية',      required: true  },
  { key: 'reorder', header: 'حد إعادة الطلب',      required: false },
  { key: 'unit',    header: 'الوحدة',              required: false },
  { key: 'sku',     header: 'كود المنتج',          required: false },
  { key: 'barcode', header: 'الباركود',            required: false },
  { key: 'notes',   header: 'ملاحظات',             required: false },
  { key: 'compat',  header: 'الموديلات المتوافقة', required: false },
] as const satisfies readonly ColumnSpec<string>[]

const DEVICE_COLUMNS = [
  { key: 'imei1',    header: 'IMEI 1',          required: true  },
  { key: 'imei2',    header: 'IMEI 2',          required: false },
  { key: 'brand',    header: 'الماركة',         required: true  },
  { key: 'model',    header: 'الموديل',         required: true  },
  { key: 'storage',  header: 'التخزين',         required: false },
  { key: 'color',    header: 'اللون',           required: false },
  { key: 'cond',     header: 'الحالة',          required: true  },
  { key: 'cost',     header: 'سعر التكلفة',     required: true  },
  { key: 'sell',     header: 'سعر البيع',       required: false },
  { key: 'date',     header: 'تاريخ الشراء',    required: true  },
  { key: 'warranty', header: 'الضمان',          required: false },
  { key: 'serial',   header: 'الرقم التسلسلي',  required: false },
  { key: 'notes',    header: 'ملاحظات',         required: false },
] as const satisfies readonly ColumnSpec<string>[]

type ProductKey = (typeof PRODUCT_COLUMNS)[number]['key']
type DeviceKey  = (typeof DEVICE_COLUMNS)[number]['key']
type Columns<K extends string> = Record<K, number>

function headerText(v: Cell): string {
  return str(v).replace(/[*＊]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function resolveColumns<K extends string>(
  header:    Row,
  specs:     readonly ColumnSpec<K>[],
  sheetName: string,
): Columns<K> {
  const texts   = header.map(headerText)
  const index   = {} as Columns<K>
  const missing: string[] = []

  for (const spec of specs) {
    const i = texts.findIndex(t => t.startsWith(spec.header.toLowerCase()))
    index[spec.key] = i
    if (i === -1 && spec.required) missing.push(spec.header)
  }

  if (missing.length > 0) {
    throw new Error(`الشيت "${sheetName}" ناقصه الأعمدة دي: ${missing.join('، ')} — حمّل القالب الأصلي واستخدمه`)
  }
  return index
}

function at(row: Row, i: number): Cell {
  return i >= 0 && i < row.length ? row[i] : null
}

// ── Sheet detection ───────────────────────────────────────────────────────────

type SheetKind = 'products' | 'devices'

function detectKind(row: Row): SheetKind | null {
  const texts = row.map(headerText)
  if (texts.some(t => t.startsWith('اسم المنتج'))) return 'products'
  if (texts.some(t => t.startsWith('imei')))       return 'devices'
  return null
}

function findHeader(data: Row[]): { index: number; kind: SheetKind } | null {
  const limit = Math.min(data.length, HEADER_SCAN_ROWS)
  for (let i = 0; i < limit; i++) {
    const kind = detectKind(data[i])
    if (kind) return { index: i, kind }
  }
  return null
}

interface DataRow {
  row:    Row
  rowNum: number
}

// الصف اللي بعد العناوين مباشرة لو بدأ بكلمة "مثال" يبقى صف التلميحات في القالب — بيتتجاهل
function extractDataRows(data: Row[], headerIndex: number): DataRow[] {
  const out: DataRow[] = []
  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i]
    if (row.every(c => str(c) === '')) continue
    if (i === headerIndex + 1 && str(row[0]).startsWith('مثال')) continue
    out.push({ row, rowNum: i + 1 })
  }
  return out
}

function summarize<T>(sheetName: string, rows: ParsedRow<T>[]): ParsedSheet<T> {
  const valid = rows.filter(r => r.valid).length
  return { sheetName, rows, total: rows.length, valid, invalid: rows.length - valid }
}

// ── Product rows ──────────────────────────────────────────────────────────────

function splitList(v: Cell): string[] | null {
  const items = str(v).split(/[,،;؛\n]/).map(s => s.trim()).filter(Boolean)
  return items.length > 0 ? items : null
}

function parseProductRow(row: Row, cols: Columns<ProductKey>, rowNum: number): ParsedRow<ImportProductRow> {
  const errors: string[] = []

  const sku          = str(at(row, cols.sku))
  const name         = str(at(row, cols.name))
  const categoryName = str(at(row, cols.cat))
  const categoryType = lookup(PRODUCT_TYPE_ALIASES, at(row, cols.type))
  const cost         = num(at(row, cols.cost))
  const sell         = num(at(row, cols.sell))
  const qty          = num(at(row, cols.qty))
  const reorder      = num(at(row, cols.reorder))

  if (!name) {
    errors.push(sku
      ? 'اسم المنتج مطلوب — الكود مش موجود في "قائمة المنتجات"، اكتب الاسم بإيدك أو نزّل القالب من جديد'
      : 'اسم المنتج مطلوب')
  }
  if (!categoryName) errors.push('الفئة مطلوبة')
  if (!categoryType) errors.push('نوع الفئة لازم يكون: إكسسوار أو قطعة غيار')
  if (cost === null || cost < 0) errors.push('سعر التكلفة لازم يكون رقم صفر أو أكبر')
  if (sell === null || sell < 0) errors.push('سعر البيع لازم يكون رقم صفر أو أكبر')
  if (qty  === null || qty  < 0) errors.push('الكمية لازم تكون رقم صفر أو أكبر')
  if (reorder !== null && reorder < 0) errors.push('حد إعادة الطلب لازم يكون رقم صفر أو أكبر')

  if (errors.length > 0 || !categoryType || cost === null || sell === null || qty === null) {
    return { rowNum, errors, valid: false }
  }

  return {
    rowNum,
    errors: [],
    valid:  true,
    data: {
      sheet_row:         rowNum,
      name,
      category_name:     categoryName,
      category_type:     categoryType,
      cost_price:        cost,
      selling_price:     sell,
      stock_qty:         Math.round(qty),
      reorder_level:     reorder !== null ? Math.round(reorder) : 5,
      unit:              str(at(row, cols.unit)) || 'قطعة',
      sku:               sku || null,
      barcode:           str(at(row, cols.barcode)) || null,
      notes:             str(at(row, cols.notes))   || null,
      compatible_models: splitList(at(row, cols.compat)),
    },
  }
}

function parseProductsSheet(sheetName: string, data: Row[], headerIndex: number): ParsedSheet<ImportProductRow> | null {
  const cols = resolveColumns(data[headerIndex], PRODUCT_COLUMNS, sheetName)
  const rows = extractDataRows(data, headerIndex).map(({ row, rowNum }) => parseProductRow(row, cols, rowNum))
  return rows.length > 0 ? summarize(sheetName, rows) : null
}

// ── Device rows ───────────────────────────────────────────────────────────────

function parseDeviceRow(row: Row, cols: Columns<DeviceKey>, rowNum: number): ParsedRow<ImportDeviceRow> {
  const errors: string[] = []

  const imei1Raw  = str(at(row, cols.imei1))
  const imei1     = digitsOnly(at(row, cols.imei1))
  const imei2     = digitsOnly(at(row, cols.imei2))
  const brand     = str(at(row, cols.brand))
  const model     = str(at(row, cols.model))
  const condition = lookup(CONDITION_ALIASES, at(row, cols.cond))
  const cost      = num(at(row, cols.cost))
  const sell      = num(at(row, cols.sell))
  const warranty  = num(at(row, cols.warranty))
  const dateRaw   = at(row, cols.date)
  const date      = toIsoDate(dateRaw)

  if (imei1.length !== 15) errors.push(`IMEI 1 لازم يكون 15 رقم (المكتوب: "${imei1Raw}")`)
  if (imei2 && imei2.length !== 15) errors.push('IMEI 2 لازم يكون 15 رقم أو فاضي')
  if (!brand) errors.push('الماركة مطلوبة')
  if (!model) errors.push('الموديل مطلوب')
  if (!condition) errors.push('الحالة لازم تكون: جديد أو مستعمل أو مجدد')
  if (cost === null || cost <= 0) errors.push('سعر التكلفة مطلوب ولازم يكون أكبر من صفر')
  if (sell !== null && sell < 0) errors.push('سعر البيع لازم يكون رقم صفر أو أكبر')
  if (warranty !== null && warranty < 0) errors.push('الضمان لازم يكون رقم صفر أو أكبر')
  if (str(dateRaw) === '') errors.push('تاريخ الشراء مطلوب')
  else if (!date) errors.push(`تاريخ الشراء غير صحيح (المكتوب: "${str(dateRaw)}") — اكتبه بالشكل 2025-01-15`)

  if (errors.length > 0 || !condition || cost === null || !date) {
    return { rowNum, errors, valid: false }
  }

  return {
    rowNum,
    errors: [],
    valid:  true,
    data: {
      sheet_row:       rowNum,
      imei1,
      imei2:           imei2 || null,
      brand_name:      brand,
      model_name:      model,
      storage:         str(at(row, cols.storage)) || null,
      color:           str(at(row, cols.color))   || null,
      condition,
      cost_price:      cost,
      selling_price:   sell ?? cost,
      purchase_date:   date,
      warranty_months: warranty !== null ? Math.round(warranty) : 12,
      serial_number:   str(at(row, cols.serial)) || null,
      notes:           str(at(row, cols.notes))  || null,
    },
  }
}

// IMEI مكرر داخل نفس الملف — الصف الأول يفضل صحيح، والتكرار بيتعلّم خطأ
function flagDuplicateImeis(rows: ParsedRow<ImportDeviceRow>[]): ParsedRow<ImportDeviceRow>[] {
  const firstSeen = new Map<string, number>()
  return rows.map(r => {
    if (!r.valid || !r.data) return r
    const first = firstSeen.get(r.data.imei1)
    if (first === undefined) {
      firstSeen.set(r.data.imei1, r.rowNum)
      return r
    }
    return { rowNum: r.rowNum, errors: [`IMEI مكرر في الملف (ظهر قبل كده في صف ${first})`], valid: false }
  })
}

function parseDevicesSheet(sheetName: string, data: Row[], headerIndex: number): ParsedSheet<ImportDeviceRow> | null {
  const cols = resolveColumns(data[headerIndex], DEVICE_COLUMNS, sheetName)
  const rows = extractDataRows(data, headerIndex).map(({ row, rowNum }) => parseDeviceRow(row, cols, rowNum))
  return rows.length > 0 ? summarize(sheetName, flagDuplicateImeis(rows)) : null
}

// ── Import execution ──────────────────────────────────────────────────────────

function validData<T>(sheet: ParsedSheet<T> | null): T[] {
  if (!sheet) return []
  return sheet.rows.flatMap(r => (r.valid && r.data ? [r.data] : []))
}

async function guarded(rowCount: number, run: () => Promise<ImportResult>): Promise<ImportResult> {
  try {
    return await run()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: 0, failed: rowCount, errors: [{ row: GENERAL_ERROR_ROW, message }] }
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const importService = {

  // قراءة الملف + التحقق من الصفوف (بدون أي كتابة في قاعدة البيانات)
  parseFile: async (file: File): Promise<ParsedWorkbook> => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('الملف لازم يكون Excel بصيغة .xlsx (مش .xls ولا .csv)')
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('حجم الملف أكبر من 10 MB')
    }

    let sheets: { sheet: string; data: Row[] }[]
    try {
      const raw = await readExcelFile(file)
      sheets = raw.map(s => ({ sheet: s.sheet, data: s.data.map(r => r.map(toCell)) }))
    } catch {
      throw new Error('تعذّر قراءة الملف — اتأكد إنه ملف Excel سليم بصيغة .xlsx')
    }

    const result: ParsedWorkbook = { products: null, devices: null }
    let recognized = false

    for (const { sheet, data } of sheets) {
      const header = findHeader(data)
      if (!header) continue
      recognized = true

      if (header.kind === 'products' && !result.products) {
        result.products = parseProductsSheet(sheet, data, header.index)
      } else if (header.kind === 'devices' && !result.devices) {
        result.devices = parseDevicesSheet(sheet, data, header.index)
      }
    }

    if (!recognized) {
      throw new Error('الملف مش على شكل القالب — حمّل القالب من الزر الأخضر واكتب بياناتك فيه')
    }
    if (!result.products && !result.devices) {
      throw new Error('مفيش صفوف بيانات في الملف — اكتب بياناتك من الصف 5 في شيت المنتجات أو شيت الأجهزة')
    }
    return result
  },

  // تنفيذ الاستيراد للصفوف الصحيحة فقط: المنتجات أولاً ثم الأجهزة
  runImport: async (
    plan:        ParsedWorkbook,
    userId:      string,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ImportOutcome> => {
    const productRows = validData(plan.products)
    const deviceRows  = validData(plan.devices)
    const total       = productRows.length + deviceRows.length

    const products = productRows.length > 0
      ? await guarded(productRows.length, () =>
          importRepository.importProducts(productRows, userId, done => onProgress?.(done, total)))
      : null

    const devices = deviceRows.length > 0
      ? await guarded(deviceRows.length, () =>
          importRepository.importDevices(deviceRows, userId, done => onProgress?.(productRows.length + done, total)))
      : null

    return { products, devices }
  },
}
