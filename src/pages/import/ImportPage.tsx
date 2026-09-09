// src/pages/import/ImportPage.tsx
import { useCallback, useRef, useState } from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle,
  ArrowRight, Download, RefreshCw, Loader2, Package, Smartphone,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { importService } from '@/services/import.service'
import type { ParseResult, ParsedRow } from '@/services/import.service'
import type { ImportProductRow, ImportDeviceRow, ImportResult } from '@/repositories/import.repository'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'

// ── Template download ─────────────────────────────────────────────────────────
// We host the template in /public
const TEMPLATE_URL = '/mobile-shop-control/import-template.xlsx'

// ── Step indicators ───────────────────────────────────────────────────────────
type Step = 'upload' | 'preview' | 'importing' | 'done'

function StepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload',    label: 'رفع الملف' },
    { key: 'preview',   label: 'مراجعة البيانات' },
    { key: 'importing', label: 'استيراد' },
    { key: 'done',      label: 'اكتمل' },
  ]
  const idx = steps.findIndex(s => s.key === step)
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
            i <= idx
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
          )}>
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              {i < idx ? '✓' : i + 1}
            </span>
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className={cn('w-6 h-0.5 mx-0.5', i < idx ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Product Preview Table ─────────────────────────────────────────────────────
function ProductPreviewTable({ rows }: { rows: ParsedRow<ImportProductRow>[] }) {
  const [showErrors, setShowErrors] = useState(true)
  const visible = showErrors ? rows : rows.filter(r => r.valid)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">{visible.length} صف</span>
        <button onClick={() => setShowErrors(v => !v)}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
          {showErrors ? <><ChevronUp size={12} /> إخفاء الأخطاء</> : <><ChevronDown size={12} /> إظهار الأخطاء</>}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 w-10">الصف</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">اسم المنتج</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">الفئة</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">النوع</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">التكلفة</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">سعر البيع</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">الكمية</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={i} className={cn(
                'border-b border-gray-100 dark:border-gray-800 last:border-0',
                r.valid
                  ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  : 'bg-red-50 dark:bg-red-900/10',
              )}>
                <td className="px-3 py-2 text-gray-400 dark:text-gray-600 font-mono">{r.rowNum}</td>
                <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">
                  {r.data?.name ?? <span className="text-red-500">—</span>}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{r.data?.category_name ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={cn(
                    'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium',
                    r.data?.category_type === 'accessory'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : r.data?.category_type === 'spare_part'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-100 text-red-700',
                  )}>
                    {r.data?.category_type === 'accessory' ? 'إكسسوار' : r.data?.category_type === 'spare_part' ? 'قطعة غيار' : '⚠ خطأ'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                  {r.data ? fmt(r.data.cost_price) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                  {r.data ? fmt(r.data.selling_price) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900 dark:text-white">
                  {r.data?.stock_qty ?? '—'}
                </td>
                <td className="px-3 py-2">
                  {r.valid ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle size={12} /> صحيح
                    </span>
                  ) : (
                    <div>
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
                        <XCircle size={12} /> خطأ
                      </span>
                      {r.errors.map((e, ei) => (
                        <p key={ei} className="text-red-500 dark:text-red-400 text-[10px] leading-tight">{e}</p>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Device Preview Table ──────────────────────────────────────────────────────
function DevicePreviewTable({ rows }: { rows: ParsedRow<ImportDeviceRow>[] }) {
  const [showErrors, setShowErrors] = useState(true)
  const visible = showErrors ? rows : rows.filter(r => r.valid)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">{visible.length} صف</span>
        <button onClick={() => setShowErrors(v => !v)}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
          {showErrors ? <><ChevronUp size={12} /> إخفاء الأخطاء</> : <><ChevronDown size={12} /> إظهار الأخطاء</>}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 w-10">الصف</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">IMEI 1</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">الماركة</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">الموديل</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">التخزين</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">الحالة</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">التكلفة</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">تاريخ الشراء</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const condMap: Record<string, string> = { new: 'جديد', used: 'مستعمل', refurbished: 'مجدد' }
              return (
                <tr key={i} className={cn(
                  'border-b border-gray-100 dark:border-gray-800 last:border-0',
                  r.valid ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-red-50 dark:bg-red-900/10',
                )}>
                  <td className="px-3 py-2 text-gray-400 dark:text-gray-600 font-mono">{r.rowNum}</td>
                  <td className="px-3 py-2 font-mono text-gray-900 dark:text-white text-[11px]">
                    {r.data?.imei1 ?? <span className="text-red-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.data?.brand_name ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.data?.model_name ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.data?.storage ?? '—'}</td>
                  <td className="px-3 py-2">
                    {r.data?.condition && (
                      <span className={cn(
                        'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium',
                        r.data.condition === 'new'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : r.data.condition === 'used'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                      )}>
                        {condMap[r.data.condition] ?? r.data.condition}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                    {r.data ? fmt(r.data.cost_price) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                    {r.data?.purchase_date ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {r.valid ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle size={12} /> صحيح
                      </span>
                    ) : (
                      <div>
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
                          <XCircle size={12} /> خطأ
                        </span>
                        {r.errors.map((e, ei) => (
                          <p key={ei} className="text-red-500 dark:text-red-400 text-[10px] leading-tight">{e}</p>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
        <span>جاري الاستيراد...</span>
        <span>{done} / {total} ({pct}%)</span>
      </div>
      <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ImportPage() {
  const { profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step,       setStep]       = useState<Step>('upload')
  const [parseResult, setParseResult] = useState<ParseResult<ImportProductRow> | ParseResult<ImportDeviceRow> | null>(null)
  const [parseError,  setParseError]  = useState<string | null>(null)
  const [parsing,     setParsing]     = useState(false)
  const [progress,    setProgress]    = useState({ done: 0, total: 0 })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragOver,    setDragOver]    = useState(false)

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setParseError('الملف يجب أن يكون بصيغة .xlsx')
      return
    }
    setParsing(true)
    setParseError(null)
    try {
      const result = await importService.parseFile(file)
      setParseResult(result)
      setStep('preview')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'فشل قراءة الملف')
    } finally {
      setParsing(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }, [handleFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }, [handleFile])

  // ── Import execution ───────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!parseResult || !profile) return
    const validRows = parseResult.rows.filter(r => r.valid)
    if (validRows.length === 0) return

    setStep('importing')
    setProgress({ done: 0, total: validRows.length })

    try {
      let result: ImportResult
      if (parseResult.type === 'products') {
        result = await importService.importProducts(
          (validRows as ParsedRow<ImportProductRow>[]).map(r => r.data!),
          profile.id,
          (done, total) => setProgress({ done, total }),
        )
      } else {
        result = await importService.importDevices(
          (validRows as ParsedRow<ImportDeviceRow>[]).map(r => r.data!),
          profile.id,
          (done, total) => setProgress({ done, total }),
        )
      }
      setImportResult(result)
      setStep('done')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'فشل الاستيراد')
      setStep('preview')
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep('upload')
    setParseResult(null)
    setParseError(null)
    setImportResult(null)
    setProgress({ done: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validCount = parseResult?.valid ?? 0
  const typeLabel  = parseResult?.type === 'products' ? 'منتج' : 'جهاز'
  const TypeIcon   = parseResult?.type === 'products' ? Package : Smartphone

  return (
    <div className="max-w-5xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">استيراد البيانات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ارفع ملف Excel لاستيراد المنتجات أو الأجهزة دفعة واحدة</p>
        </div>
        <a
          href={TEMPLATE_URL}
          download="mobile_shop_import_template.xlsx"
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <Download size={15} />
          تحميل القالب
        </a>
      </div>

      {/* Step bar */}
      <StepBar step={step} />

      {/* ── STEP: UPLOAD ──────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all',
              dragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50',
            )}
          >
            {parsing ? (
              <>
                <Loader2 size={40} className="text-blue-500 animate-spin" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">جاري قراءة الملف...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                  <FileSpreadsheet size={32} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">اسحب الملف هنا أو اضغط للاختيار</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">صيغة .xlsx فقط — أقصى حجم 10 MB</p>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Package size={14} className="text-blue-500" /> شيت المنتجات
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={14} className="text-green-500" /> شيت الأجهزة
                  </div>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onFileChange}
          />

          {parseError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
              <XCircle size={18} className="flex-shrink-0" />
              <p className="text-sm font-medium">{parseError}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Upload size={15} className="text-blue-500" />
              كيفية الاستخدام
            </h3>
            <ol className="space-y-3">
              {[
                'حمّل القالب من الزر الأخضر في الأعلى',
                'افتح شيت "منتجات وإكسسوارات" أو "أجهزة موبايل" حسب اللي تريده',
                'احذف صفوف الأمثلة (من الصف 5) واكتب بياناتك الحقيقية',
                'احفظ الملف بصيغة .xlsx',
                'ارفعه هنا — النظام هيعرض Preview قبل الحفظ',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ── STEP: PREVIEW ─────────────────────────────────────────────────── */}
      {step === 'preview' && parseResult && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <TypeIcon size={18} className="text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">إجمالي الصفوف</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{parseResult.total}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">صحيح — جاهز للاستيراد</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{parseResult.valid}</p>
              </div>
            </div>
            <div className={cn(
              'bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-center gap-3',
              parseResult.invalid > 0
                ? 'border-red-200 dark:border-red-900'
                : 'border-gray-200 dark:border-gray-800',
            )}>
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                parseResult.invalid > 0
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-gray-50 dark:bg-gray-800',
              )}>
                {parseResult.invalid > 0
                  ? <XCircle size={18} className="text-red-600 dark:text-red-400" />
                  : <CheckCircle size={18} className="text-gray-400" />}
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">به أخطاء</p>
                <p className={cn(
                  'text-xl font-bold',
                  parseResult.invalid > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-400',
                )}>{parseResult.invalid}</p>
              </div>
            </div>
          </div>

          {/* Warning if some invalid */}
          {parseResult.invalid > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {parseResult.invalid} صف به أخطاء — لن يتم استيراده
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  سيتم استيراد {parseResult.valid} صف صحيح فقط. عدّل الملف وأعد الرفع لو أردت استيراد الكل.
                </p>
              </div>
            </div>
          )}

          {/* Data type label */}
          <div className="flex items-center gap-2">
            <TypeIcon size={16} className={parseResult.type === 'products' ? 'text-blue-600' : 'text-green-600'} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {parseResult.type === 'products' ? 'شيت المنتجات' : 'شيت الأجهزة'}
            </span>
          </div>

          {/* Table */}
          {parseResult.type === 'products'
            ? <ProductPreviewTable rows={parseResult.rows as ParsedRow<ImportProductRow>[]} />
            : <DevicePreviewTable  rows={parseResult.rows as ParsedRow<ImportDeviceRow>[]} />
          }

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button onClick={reset}
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ArrowRight size={15} /> رفع ملف تاني
            </button>
            <button
              onClick={() => void handleImport()}
              disabled={validCount === 0}
              className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/25"
            >
              <Upload size={15} />
              استيراد {validCount} {typeLabel}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: IMPORTING ───────────────────────────────────────────────── */}
      {step === 'importing' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Loader2 size={32} className="text-blue-600 animate-spin" />
          </div>
          <div className="w-full max-w-md">
            <ProgressBar done={progress.done} total={progress.total} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">يرجى الانتظار — لا تغلق الصفحة</p>
        </div>
      )}

      {/* ── STEP: DONE ────────────────────────────────────────────────────── */}
      {step === 'done' && importResult && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
            <div className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center',
              importResult.failed === 0
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-amber-50 dark:bg-amber-900/20',
            )}>
              {importResult.failed === 0
                ? <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
                : <AlertTriangle size={40} className="text-amber-600 dark:text-amber-400" />}
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {importResult.failed === 0 ? 'اكتمل الاستيراد بنجاح! 🎉' : 'اكتمل الاستيراد مع بعض الأخطاء'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {importResult.success > 0 && `تم استيراد ${importResult.success} ${typeLabel} بنجاح`}
                {importResult.failed > 0 && ` · فشل ${importResult.failed}`}
              </p>
            </div>

            <div className="flex gap-4">
              <div className="text-center px-6 py-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{importResult.success}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">نجح</p>
              </div>
              {importResult.failed > 0 && (
                <div className="text-center px-6 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{importResult.failed}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">فشل</p>
                </div>
              )}
            </div>
          </div>

          {/* Error list */}
          {importResult.errors.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-xl p-4">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                <XCircle size={15} /> أخطاء الاستيراد
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                    <span className="font-mono text-gray-400 w-12 flex-shrink-0">صف {e.row}</span>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button onClick={reset}
              className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
              <RefreshCw size={15} /> استيراد ملف جديد
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
