// src/pages/device-sign/DeviceSignPage.tsx — لافتة جهاز للطباعة بس (مش مرتبطة بأي جهاز في النظام)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { buildSignHtml, printSign, signBaseUrl, SIGN_PAGE_PX, type SignData, type SignSize } from '@/lib/printSign'

const SIZES: { value: SignSize; label: string }[] = [
  { value: 'label', label: 'ليبل 38×25 مم' },
  { value: 'a4',    label: 'ورقة A4 عرضي'   },
]

const CONDITION_SUGGESTIONS = ['جديد', 'مستعمل', 'كسر زيرو', 'مجدد']

const FIELD = 'h-10 w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500'

// بيحسب نسبة تصغير المعاينة على قد عرض المكان المتاح
function usePreviewScale(pageWidth: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / pageWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [pageWidth])
  return { ref, scale }
}

export function DeviceSignPage() {
  const [name, setName]           = useState('')
  const [spec, setSpec]           = useState('')
  const [condition, setCondition] = useState('')
  const [battery, setBattery]     = useState('')
  const [size, setSize]         = useState<SignSize>('label')
  const page = SIGN_PAGE_PX[size]
  const { ref, scale } = usePreviewScale(page.width)

  const data: SignData = useMemo(() => ({
    name, spec, condition, battery: battery === '' ? null : Number(battery),
  }), [name, spec, condition, battery])

  const previewHtml = useMemo(() => buildSignHtml(data, size, signBaseUrl(), false), [data, size])
  const empty = !name.trim() && !spec.trim() && !condition.trim() && battery === ''

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">لافتة الجهاز</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          اكتب بيانات الجهاز واطبع لافتة بلوجو المحل (ليبل أو A4) — للطباعة بس ومش بتتحفظ ولا بتتربط بجهاز في النظام
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">مقاس الطباعة</label>
              <div className="flex gap-2">
                {SIZES.map(sz => (
                  <button key={sz.value} type="button" onClick={() => setSize(sz.value)}
                    className={cn('flex-1 h-10 rounded-lg border text-sm font-medium transition-colors',
                      size === sz.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}>
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">اسم الجهاز</label>
              <input className={FIELD} value={name} onChange={e => setName(e.target.value)} placeholder="Samsung A07" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">النوع / السعة</label>
              <input className={FIELD} value={spec} onChange={e => setSpec(e.target.value)} placeholder="4/128 GB" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">الحالة</label>
              <input className={FIELD} value={condition} onChange={e => setCondition(e.target.value)}
                list="sign-conditions" placeholder="كسر زيرو" />
              <datalist id="sign-conditions">
                {CONDITION_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                البطارية (%) <span className="text-gray-400 font-normal">اختياري</span>
              </label>
              <input className={FIELD} type="number" min="0" max="100" value={battery}
                onChange={e => {
                  const v = e.target.value
                  if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setBattery(v)
                }}
                placeholder="85" />
            </div>
            <Button className="w-full" icon={<Printer size={16} />} disabled={empty} onClick={() => printSign(data, size)}>
              طباعة اللافتة
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <div ref={ref} className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white"
            style={{ height: page.height * scale }}>
            <iframe title="معاينة اللافتة" srcDoc={previewHtml} tabIndex={-1}
              className="absolute top-0 right-0 border-0 origin-top-right pointer-events-none"
              style={{ width: page.width, height: page.height, transform: `scale(${scale})` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">معاينة — بتتطبع بنفس المقاس المختار</p>
        </div>
      </div>
    </div>
  )
}
