// src/pages/import/ImportPage.tsx
import { useCallback, useRef, useState } from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle,
  ArrowRight, Download, RefreshCw, Loader2, Package, Smartphone,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useParseImportFile, useRunImport } from '@/hooks/useImport'
import type { ImportOutcome, ParsedWorkbook } from '@/services/import.service'
import { cn } from '@/lib/cn'
import { TEMPLATE_FILE_NAME, TEMPLATE_URL } from './constants'
import { StepBar, type ImportStep } from './components/StepBar'
import { ProgressBar } from './components/ProgressBar'
import { ProductPreviewTable } from './components/ProductPreviewTable'
import { DevicePreviewTable } from './components/DevicePreviewTable'
import { ImportResultCard } from './components/ImportResultCard'

const INSTRUCTIONS = [
  'حمّل القالب من الزر الأخضر في الأعلى',
  'افتح شيت "منتجات وإكسسوارات" أو "أجهزة موبايل" (أو الاتنين) واكتب بياناتك من الصف 5',
  'احفظ الملف بصيغة .xlsx — مش محتاج تمسح أو تعدّل أي حاجة تانية',
  'ارفعه هنا — النظام هيعرض معاينة قبل الحفظ، وبعدها تأكّد الاستيراد',
]

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'good' | 'bad' }) {
  const palette = {
    neutral: { box: 'border-gray-200 dark:border-gray-800', icon: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-900 dark:text-white' },
    good:    { box: 'border-green-200 dark:border-green-900', icon: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
    bad:     { box: 'border-red-200 dark:border-red-900', icon: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
  }[tone]
  const Icon = tone === 'bad' ? XCircle : tone === 'good' ? CheckCircle : FileSpreadsheet
  return (
    <div className={cn('bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-center gap-3', palette.box)}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', palette.icon)}>
        <Icon size={18} className={palette.text} />
      </div>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className={cn('text-xl font-bold', palette.text)}>{value}</p>
      </div>
    </div>
  )
}

function SheetHeading({ icon: Icon, tone, title, valid, invalid }: {
  icon:    typeof Package
  tone:    string
  title:   string
  valid:   number
  invalid: number
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Icon size={16} className={tone} />
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">
        · {valid} صحيح{invalid > 0 ? ` · ${invalid} به أخطاء` : ''}
      </span>
    </div>
  )
}

function countOf(plan: ParsedWorkbook, field: 'total' | 'valid' | 'invalid'): number {
  return (plan.products?.[field] ?? 0) + (plan.devices?.[field] ?? 0)
}

export function ImportPage() {
  const { profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { mutateAsync: parseFile, isPending: parsing } = useParseImportFile()
  const { mutateAsync: runImport, isPending: running }  = useRunImport()

  const [step,     setStep]     = useState<ImportStep>('upload')
  const [plan,     setPlan]     = useState<ParsedWorkbook | null>(null)
  const [outcome,  setOutcome]  = useState<ImportOutcome | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    try {
      const parsed = await parseFile(file)
      setPlan(parsed)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل قراءة الملف')
    }
  }, [parseFile])

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

  const validCount = plan ? countOf(plan, 'valid') : 0

  const handleImport = async () => {
    if (!plan || !profile || validCount === 0) return
    setError(null)
    setStep('importing')
    setProgress({ done: 0, total: validCount })
    try {
      const result = await runImport({
        plan,
        userId:     profile.id,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      setOutcome(result)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الاستيراد')
      setStep('preview')
    }
  }

  const reset = () => {
    setStep('upload')
    setPlan(null)
    setOutcome(null)
    setError(null)
    setProgress({ done: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">استيراد البيانات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ارفع ملف Excel لإضافة المنتجات أو الأجهزة دفعة واحدة</p>
        </div>
        <a
          href={TEMPLATE_URL}
          download={TEMPLATE_FILE_NAME}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <Download size={15} />
          تحميل القالب
        </a>
      </div>

      <StepBar step={step} />

      {/* ── UPLOAD ────────────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center gap-4 cursor-pointer transition-all',
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
            accept=".xlsx"
            className="hidden"
            onChange={onFileChange}
          />

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
              <XCircle size={18} className="flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Upload size={15} className="text-blue-500" />
              كيفية الاستخدام
            </h3>
            <ol className="space-y-3">
              {INSTRUCTIONS.map((s, i) => (
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

      {/* ── PREVIEW ───────────────────────────────────────────────────────── */}
      {step === 'preview' && plan && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard label="إجمالي الصفوف" value={countOf(plan, 'total')} tone="neutral" />
            <SummaryCard label="صحيح — جاهز للاستيراد" value={validCount} tone="good" />
            <SummaryCard label="به أخطاء" value={countOf(plan, 'invalid')} tone={countOf(plan, 'invalid') > 0 ? 'bad' : 'neutral'} />
          </div>

          {countOf(plan, 'invalid') > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {countOf(plan, 'invalid')} صف به أخطاء — لن يتم استيراده
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  سيتم استيراد {validCount} صف صحيح فقط. عدّل الملف وأعد الرفع لو عايز تستورد الكل.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
              <XCircle size={18} className="flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {plan.products && (
            <section className="space-y-3">
              <SheetHeading icon={Package} tone="text-blue-600" title="المنتجات والإكسسوارات"
                valid={plan.products.valid} invalid={plan.products.invalid} />
              <ProductPreviewTable sheet={plan.products} />
            </section>
          )}

          {plan.devices && (
            <section className="space-y-3">
              <SheetHeading icon={Smartphone} tone="text-green-600" title="الأجهزة"
                valid={plan.devices.valid} invalid={plan.devices.invalid} />
              <DevicePreviewTable sheet={plan.devices} />
            </section>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button onClick={reset}
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ArrowRight size={15} /> رفع ملف تاني
            </button>
            <button
              onClick={() => void handleImport()}
              disabled={validCount === 0 || running}
              className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/25"
            >
              <Upload size={15} />
              استيراد {validCount} صف
            </button>
          </div>
        </div>
      )}

      {/* ── IMPORTING ─────────────────────────────────────────────────────── */}
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

      {/* ── DONE ──────────────────────────────────────────────────────────── */}
      {step === 'done' && outcome && (
        <div className="space-y-5">
          {outcome.products && (
            <ImportResultCard
              title={outcome.products.failed === 0 ? 'اكتمل استيراد المنتجات بنجاح' : 'اكتمل استيراد المنتجات مع بعض الأخطاء'}
              unit="منتج"
              result={outcome.products}
            />
          )}
          {outcome.devices && (
            <ImportResultCard
              title={outcome.devices.failed === 0 ? 'اكتمل استيراد الأجهزة بنجاح' : 'اكتمل استيراد الأجهزة مع بعض الأخطاء'}
              unit="جهاز"
              result={outcome.devices}
            />
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
